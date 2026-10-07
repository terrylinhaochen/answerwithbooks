#!/usr/bin/env python3
"""Idempotent dedicated worker deployment. Never logs the worker configuration."""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT=Path(__file__).resolve().parents[1]
AWS='/opt/homebrew/bin/aws'
REGION='us-east-2'; ACCOUNT='194722444705'
NAME='answerwithbooks-native-worker'
BUCKET=f'{NAME}-{ACCOUNT}-{REGION}'
PARAM='/answerwithbooks/native-worker/config'
PARAM_ARN=f'arn:aws:ssm:{REGION}:{ACCOUNT}:parameter{PARAM}'
VPC='vpc-0527fe978711f3c5d'; SUBNET='subnet-07c37b916f51fc1bc'
AMI='ami-09519cc56eb20524a'
INSTANCE_TYPE='m7i.large'
STATE=Path('/private/tmp/awb-native-deploy-state.json')
TAGS=[{'Key':'Application','Value':'AnswerWithBooks'},{'Key':'Name','Value':NAME}]

# Reuse AWS CLI's vendored SDK when run with its Python; CLI remains a portable fallback.
try:
    import awscli.botocore.session
    from awscli.botocore.config import Config
    SDK_SESSION=awscli.botocore.session.get_session()
except ImportError:
    SDK_SESSION=None
SDK_CLIENTS={}

def aws(service, action, payload=None, allow_missing=False, extra_args=()):
    if SDK_SESSION is not None:
        name='s3' if service=='s3api' else service
        if name not in SDK_CLIENTS:
            SDK_CLIENTS[name]=SDK_SESSION.create_client(name,region_name=REGION,config=Config(connect_timeout=15,read_timeout=60,retries={'max_attempts':3,'mode':'standard'}))
        values=dict(payload or {});body=None
        try:
            if extra_args:
                if extra_args[0]!='--body':raise ValueError('Unsupported SDK extra argument')
                body=open(extra_args[1],'rb');values['Body']=body
            return SDK_CLIENTS[name]._make_api_call(''.join(part.title() for part in action.split('-')),values)
        except Exception as error:
            code=getattr(error,'response',{}).get('Error',{}).get('Code','')
            if allow_missing and code in ('NoSuchEntity','NoSuchBucket','NoSuchKey','NotFound','404','ParameterNotFound'):return None
            raise RuntimeError(f'{service} {action}: {error}') from None
        finally:
            if body:body.close()
    command=[AWS,service,action,'--region',REGION,'--output','json','--no-cli-pager']
    filename=None
    try:
        if payload is not None:
            with tempfile.NamedTemporaryFile('w',prefix='awb-aws-',suffix='.json',delete=False) as f:
                os.chmod(f.name,0o600);json.dump(payload,f);filename=f.name
            command+=['--cli-input-json','file://'+filename]
        command+=list(extra_args)
        result=subprocess.run(command,capture_output=True,text=True,timeout=180,
            env={**os.environ,'AWS_PAGER':'','AWS_CLI_AUTO_PROMPT':'off'})
        if result.returncode:
            if allow_missing and any(code in result.stderr for code in ('NoSuchEntity','NoSuchBucket','Not Found','404','ParameterNotFound')):
                return None
            # AWS error text contains no payload; do not print stdout for secret-returning APIs.
            raise RuntimeError(f'{service} {action}: {result.stderr.strip()}')
        return json.loads(result.stdout) if result.stdout.strip() else {}
    finally:
        if filename:Path(filename).unlink(missing_ok=True)

def package():
    paths=['vendor/book-to-skill','scripts/book-adapter','scripts/native-book-worker',
        'scripts/native-worker-infra','supabase/functions/_shared/book-upload-limits.json']
    raw=io.BytesIO()
    with tarfile.open(fileobj=raw,mode='w') as tar:
        for relative in paths:
            root=ROOT/relative
            for file in sorted(root.rglob('*')) if root.is_dir() else [root]:
                if not file.is_file() or '__pycache__' in file.parts or file.suffix=='.pyc':continue
                data=file.read_bytes(); info=tarfile.TarInfo(str(file.relative_to(ROOT)))
                info.size=len(data);info.mode=0o644;info.mtime=0;tar.addfile(info,io.BytesIO(data))
    packed=gzip.compress(raw.getvalue(),mtime=0)
    sha=hashlib.sha256(packed).hexdigest();path=Path('/private/tmp')/(NAME+'-'+sha+'.tar.gz')
    path.write_bytes(packed)
    return sha,path

def tagged_instances():
    data=aws('ec2','describe-instances',{'Filters':[{'Name':'tag:Application','Values':['AnswerWithBooks']},{'Name':'tag:Name','Values':[NAME]},{'Name':'instance-state-name','Values':['pending','running','stopping','stopped']}]})
    return [i for r in data['Reservations'] for i in r['Instances']]

def save(state):
    STATE.write_text(json.dumps(state,indent=2)+'\n');os.chmod(STATE,0o600)

def prepare(config):
    sha,path=package();print('Packaged immutable worker artifact '+sha,flush=True)
    if aws('s3api','head-bucket',{'Bucket':BUCKET,'ExpectedBucketOwner':ACCOUNT},True) is None:
        aws('s3api','create-bucket',{'Bucket':BUCKET,'CreateBucketConfiguration':{'LocationConstraint':REGION}})
    aws('s3api','put-public-access-block',{'Bucket':BUCKET,'PublicAccessBlockConfiguration':{'BlockPublicAcls':True,'IgnorePublicAcls':True,'BlockPublicPolicy':True,'RestrictPublicBuckets':True}})
    aws('s3api','put-bucket-encryption',{'Bucket':BUCKET,'ServerSideEncryptionConfiguration':{'Rules':[{'ApplyServerSideEncryptionByDefault':{'SSEAlgorithm':'AES256'}}]}})
    aws('s3api','put-bucket-tagging',{'Bucket':BUCKET,'Tagging':{'TagSet':TAGS}})
    # Exact content hash key makes artifact uploads immutable and repeatable.
    key=f'releases/{sha}.tar.gz'
    found=aws('s3api','head-object',{'Bucket':BUCKET,'Key':key},True)
    if found is None:
        aws('s3api','put-object',{'Bucket':BUCKET,'Key':key,'ServerSideEncryption':'AES256','Metadata':{'sha256':sha},'IfNoneMatch':'*'},extra_args=('--body',str(path)))
    elif found.get('Metadata',{}).get('sha256')!=sha:raise RuntimeError('Artifact metadata mismatch')
    print('Private artifact stored',flush=True)
    if aws('iam','get-role',{'RoleName':NAME},True) is None:
        aws('iam','create-role',{'RoleName':NAME,'AssumeRolePolicyDocument':json.dumps({'Version':'2012-10-17','Statement':[{'Effect':'Allow','Principal':{'Service':'ec2.amazonaws.com'},'Action':'sts:AssumeRole'}]}),'Tags':TAGS})
    aws('iam','attach-role-policy',{'RoleName':NAME,'PolicyArn':'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'})
    aws('iam','put-role-policy',{'RoleName':NAME,'PolicyName':'DedicatedNativeWorkerRead','PolicyDocument':json.dumps({'Version':'2012-10-17','Statement':[{'Effect':'Allow','Action':['s3:GetObject'],'Resource':f'arn:aws:s3:::{BUCKET}/releases/*'},{'Effect':'Allow','Action':['ssm:GetParameter'],'Resource':PARAM_ARN},{'Effect':'Deny','Action':['ssm:GetParameter','ssm:GetParameters','ssm:GetParametersByPath'],'NotResource':PARAM_ARN}]})})
    profile=aws('iam','get-instance-profile',{'InstanceProfileName':NAME},True)
    if profile is None:profile=aws('iam','create-instance-profile',{'InstanceProfileName':NAME,'Tags':TAGS})
    if not any(r['RoleName']==NAME for r in profile['InstanceProfile'].get('Roles',[])):
        aws('iam','add-role-to-instance-profile',{'InstanceProfileName':NAME,'RoleName':NAME})
    print('Dedicated instance profile configured',flush=True)
    groups=aws('ec2','describe-security-groups',{'Filters':[{'Name':'group-name','Values':[NAME]},{'Name':'vpc-id','Values':[VPC]}]})['SecurityGroups']
    if not groups:
        gid=aws('ec2','create-security-group',{'GroupName':NAME,'Description':'Dedicated outbound-only Answer with Books extraction worker','VpcId':VPC,'TagSpecifications':[{'ResourceType':'security-group','Tags':TAGS}]})['GroupId']
        aws('ec2','revoke-security-group-egress',{'GroupId':gid,'IpPermissions':[{'IpProtocol':'-1','IpRanges':[{'CidrIp':'0.0.0.0/0'}]}]})
        aws('ec2','authorize-security-group-egress',{'GroupId':gid,'IpPermissions':[{'IpProtocol':'tcp','FromPort':port,'ToPort':port,'IpRanges':[{'CidrIp':'0.0.0.0/0'}]} for port in (80,443,53)]+[{'IpProtocol':'udp','FromPort':53,'ToPort':53,'IpRanges':[{'CidrIp':'0.0.0.0/0'}]}]})
    else:
        group=groups[0];gid=group['GroupId']
        if group['IpPermissions']:raise RuntimeError('Dedicated security group unexpectedly has ingress rules')
        if not any(t['Key']=='Application' and t['Value']=='AnswerWithBooks' for t in group.get('Tags',[])):raise RuntimeError('Refusing to reuse an untagged security group')
    configured=False
    if config.exists():
        if config.stat().st_mode&0o077:raise RuntimeError('Config file must be private (0600)')
        value=json.loads(config.read_text())
        if not value.get('endpoint','').startswith('https://') or len(value.get('workerSecret',''))<32:raise RuntimeError('Invalid dedicated configuration')
        aws('ssm','put-parameter',{'Name':PARAM,'Type':'SecureString','Value':json.dumps(value),'Overwrite':True,'Tier':'Standard'})
        configured=True
    previous=json.loads(STATE.read_text()) if STATE.exists() else {}
    state={**({'instanceId':previous['instanceId']} if previous.get('instanceId') else {}),'artifactSha256':sha,'artifact':f's3://{BUCKET}/{key}','securityGroupId':gid,'profile':NAME,'region':REGION,'configured':configured}
    save(state);print(json.dumps(state))

def launch():
    state=json.loads(STATE.read_text())
    if not state.get('configured'):raise RuntimeError('Prepare with the private configuration before launch')
    existing=tagged_instances()
    if len(existing)>1:raise RuntimeError('Multiple dedicated instances exist; refusing to launch')
    if existing:
        instance=existing[0]
        deployed=next((tag['Value'] for tag in instance.get('Tags',[]) if tag['Key']=='ArtifactSha256'),None)
        if deployed!=state['artifactSha256']:raise RuntimeError('Existing dedicated worker has a different artifact; use an explicit SSM update instead of launching a duplicate')
        if instance['State']['Name']=='stopped':aws('ec2','start-instances',{'InstanceIds':[instance['InstanceId']]})
    else:
        bootstrap=(ROOT/'scripts/native-worker-infra/bootstrap.sh').read_text().replace('__BUCKET__',BUCKET).replace('__SHA__',state['artifactSha256'])
        instance=aws('ec2','run-instances',{'ImageId':AMI,'InstanceType':INSTANCE_TYPE,'MinCount':1,'MaxCount':1,'ClientToken':'awb-native-'+state['artifactSha256'][:48],
            'IamInstanceProfile':{'Name':NAME},'MetadataOptions':{'HttpTokens':'required','HttpEndpoint':'enabled','HttpPutResponseHopLimit':1},
            'NetworkInterfaces':[{'DeviceIndex':0,'SubnetId':SUBNET,'Groups':[state['securityGroupId']],'AssociatePublicIpAddress':True,'DeleteOnTermination':True}],
            'BlockDeviceMappings':[{'DeviceName':'/dev/sda1','Ebs':{'VolumeSize':30,'VolumeType':'gp3','Encrypted':True,'DeleteOnTermination':True}}],
            'UserData':bootstrap,
            'TagSpecifications':[{'ResourceType':kind,'Tags':TAGS+[{'Key':'ArtifactSha256','Value':state['artifactSha256']}]} for kind in ('instance','volume')]})['Instances'][0]
    state['instanceId']=instance['InstanceId'];save(state);print(json.dumps(state))

def update():
    state=json.loads(STATE.read_text())
    if not state.get('instanceId'):raise RuntimeError('No dedicated instance to update')
    instances=tagged_instances()
    if len(instances)!=1 or instances[0]['InstanceId']!=state['instanceId']:raise RuntimeError('Dedicated instance identity mismatch')
    import base64
    bootstrap=(ROOT/'scripts/native-worker-infra/bootstrap.sh').read_text().replace('__BUCKET__',BUCKET).replace('__SHA__',state['artifactSha256'])
    encoded=base64.b64encode(bootstrap.encode()).decode()
    commands=['set -eu','install -d -m 755 /opt/awb-native',
        "printf %s '"+encoded+"' | base64 -d > /opt/awb-native/bootstrap.sh",
        'chmod 700 /opt/awb-native/bootstrap.sh',
        'systemctl stop answerwithbooks-native-worker.service 2>/dev/null || true',
        'rm -f /opt/awb-native/smoke-passed.json',
        'systemd-run --unit=awb-native-bootstrap --collect /bin/bash /opt/awb-native/bootstrap.sh']
    result=aws('ssm','send-command',{'InstanceIds':[state['instanceId']],'DocumentName':'AWS-RunShellScript','Comment':'Update dedicated native worker; converters smoke-gate service startup','Parameters':{'commands':commands,'executionTimeout':['120']},'TimeoutSeconds':120})
    state['bootstrapCommandId']=result['Command']['CommandId'];save(state)
    print(json.dumps({'instanceId':state['instanceId'],'commandId':state['bootstrapCommandId'],'artifactSha256':state['artifactSha256']}))

def status():
    instances=tagged_instances()
    print(json.dumps([{'instanceId':i['InstanceId'],'state':i['State']['Name'],'type':i['InstanceType'],'image':i['ImageId'],'metadata':i['MetadataOptions']} for i in instances]))
    if instances:
        print(json.dumps(aws('ssm','describe-instance-information',{'Filters':[{'Key':'InstanceIds','Values':[instances[0]['InstanceId']]}]}),default=str))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['prepare','launch','update','status']);parser.add_argument('--config',type=Path,default=Path('/private/tmp/awb-native-deploy-config.json'));parser.add_argument('--native-validated',action='store_true')
    args=parser.parse_args()
    if aws('sts','get-caller-identity')['Account']!=ACCOUNT:raise RuntimeError('Unexpected AWS account')
    if args.action=='prepare':prepare(args.config)
    elif args.action=='launch':
        if not args.native_validated:parser.error('launch requires --native-validated after native code tests are green; host smoke still gates service start')
        launch()
    elif args.action=='update':
        if not args.native_validated:parser.error('update requires --native-validated; host smoke gates service startup')
        update()
    else:status()

if __name__=='__main__':
    main()
