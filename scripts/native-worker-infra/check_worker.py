#!/usr/bin/env python3
"""Safe operational SSM inspection; never reads the parameter or process environment."""
import argparse
import json
from pathlib import Path
import sys
import importlib.util
spec=importlib.util.spec_from_file_location('awb_deploy',Path(__file__).resolve().parents[1]/'deploy-native-worker.py')
deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)

parser=argparse.ArgumentParser();parser.add_argument('--command-id');args=parser.parse_args()
state=json.loads(deploy.STATE.read_text());instance=state['instanceId']
if args.command_id:
    result=deploy.aws('ssm','get-command-invocation',{'CommandId':args.command_id,'InstanceId':instance})
    print(json.dumps({key:result.get(key) for key in ('CommandId','InstanceId','Status','ResponseCode','StandardOutputContent','StandardErrorContent')},indent=2))
else:
    commands=['set +e','date -u','cloud-init status --long','df -h /','systemctl is-active awb-native-bootstrap.service','systemctl is-active answerwithbooks-native-worker.service',
        'if test -f /opt/awb-native/smoke-passed.json; then cat /opt/awb-native/smoke-passed.json; fi',
        'if test -f /opt/awb-native/converter-smoke.log; then cat /opt/awb-native/converter-smoke.log; fi',
        'tail -n 25 /var/log/awb-native-bootstrap.log',
        'journalctl -u answerwithbooks-native-worker.service -n 12 --no-pager']
    response=deploy.aws('ssm','send-command',{'InstanceIds':[instance],'DocumentName':'AWS-RunShellScript','Comment':'Inspect dedicated Answer with Books worker startup; no secrets','Parameters':{'commands':commands,'executionTimeout':['120']},'TimeoutSeconds':120})
    print(json.dumps({'commandId':response['Command']['CommandId'],'instanceId':instance}))
