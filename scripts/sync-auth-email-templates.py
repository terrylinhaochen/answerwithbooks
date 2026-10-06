"""Read or apply the Answer with Books hosted email branding. Never sends email."""
import argparse,base64,json,os,subprocess,sys,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
PROJECT='yozeqanibszoxnowmvsm'
def access_token():
    token=os.environ.get('SUPABASE_ACCESS_TOKEN')
    if token:return token
    if sys.platform!='darwin':raise RuntimeError('Set SUPABASE_ACCESS_TOKEN through your secure environment.')
    result=subprocess.run(['/usr/bin/security','find-generic-password','-s','Supabase CLI','-a','access-token','-w'],capture_output=True,text=True,check=True)
    value=result.stdout.strip()
    if value.startswith('go-keyring-base64:'):return base64.b64decode(value.split(':',1)[1]).decode()
    if value.startswith('go-keyring-encoded:'):return bytes.fromhex(value.split(':',1)[1]).decode()
    return value

def sync(apply=False):
    token=access_token()
    def request(method='GET',data=None):
        req=urllib.request.Request(f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth',data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
    manifest=json.loads((ROOT/'supabase/templates/manifest.json').read_text())
    before=request()
    expected={}
    if before.get('smtp_host'):expected['smtp_sender_name']='Answer with Books'
    for name,entry in manifest.items():
        expected['mailer_subjects_'+name]=entry['subject']
        expected['mailer_templates_'+name+'_content']=(ROOT/'supabase/templates'/entry['file']).read_text()
    differences=[key for key,value in expected.items() if before.get(key)!=value]
    if not apply:
        print(json.dumps({'matches':not differences,'differentFields':differences,'emailsSent':0},indent=2))
        return not differences
    if differences:request('PATCH',{key:expected[key] for key in differences})
    after=request()
    assert all(after.get(key)==value for key,value in expected.items()),'Hosted email verification failed'
    protected=['mailer_autoconfirm','external_email_enabled','site_url','uri_allow_list','smtp_host','smtp_port','smtp_user','smtp_pass','smtp_admin_email','mailer_otp_exp','rate_limit_email_sent']
    protected.extend(key for key in before if key.endswith('_notification_enabled'))
    assert all(before.get(key)==after.get(key) for key in protected),'Unrelated authentication setting changed'
    print(json.dumps({'matches':True,'updatedFields':len(differences),'templatesVerified':len(manifest),'senderNamePendingSmtp':not bool(after.get('smtp_host')),'otherAuthSettingsPreserved':True,'emailsSent':0},indent=2))
    return True
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args();sys.exit(0 if sync(args.apply) else 1)
