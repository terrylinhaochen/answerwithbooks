"""Connect the verified Answer with Books Resend domain. No email is sent."""
import argparse,importlib.util,json,os,smtplib,ssl,subprocess,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('email_templates',ROOT/'sync-auth-email-templates.py')
templates=importlib.util.module_from_spec(spec);spec.loader.exec_module(templates)
DOMAIN_ID='948eaeb0-621c-428c-90d8-6195964781f5'
DOMAIN='auth.answerwithbooks.com'
SENDER='no-reply@'+DOMAIN

def resend(*args):
    result=subprocess.run(['npx','--yes','resend-cli',*args,'--json'],capture_output=True,text=True,env={**os.environ,'RESEND_TELEMETRY_DISABLED':'1'},timeout=60)
    if result.returncode:raise RuntimeError('Resend '+args[0]+' operation failed; check the logged-in workspace and permissions.')
    return json.loads(result.stdout)

def connect(apply=False):
    domain=resend('domains','get',DOMAIN_ID)
    assert domain.get('name')==DOMAIN,'Unexpected sending domain'
    token=templates.access_token()
    def config(method='GET',data=None):
        req=urllib.request.Request(f'https://api.supabase.com/v1/projects/{templates.PROJECT}/config/auth',data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
    before=config()
    expected={'smtp_host':'smtp.resend.com','smtp_port':'465','smtp_user':'resend','smtp_admin_email':SENDER,'smtp_sender_name':'Answer with Books','rate_limit_email_sent':30}
    def matches(current):return all(str(current.get(key))==str(value) for key,value in expected.items()) and bool(current.get('smtp_pass'))
    if not apply:
        print(json.dumps({'domain':DOMAIN,'domainStatus':domain['status'],'smtpMatches':matches(before),'emailsSent':0},indent=2));return
    if domain.get('status')!='verified':raise RuntimeError('Complete domain DNS verification before enabling SMTP.')
    assert domain.get('capabilities',{}).get('sending')=='enabled','Domain sending is not enabled'
    created=None
    if not matches(before):
        created=resend('api-keys','create','--name','answerwithbooks-supabase-production','--permission','sending_access','--domain-id',DOMAIN_ID)
        # Capture the one-time key in memory and send it directly to Supabase. Never print or save it.
        key=created.pop('token');assert key.startswith('re_'),'Unexpected key format'
        try:
            with smtplib.SMTP_SSL('smtp.resend.com',465,context=ssl.create_default_context(),timeout=30) as smtp:
                smtp.login('resend',key)
                smtp.noop()
            config('PATCH',{**expected,'smtp_pass':key})
        except Exception:
            # Revoke only the unused key just created by this invocation.
            resend('api-keys','delete',created['id']);raise
        finally:key=None
    after=config();assert matches(after),'SMTP readback did not match'
    protected=['mailer_autoconfirm','external_email_enabled','site_url','uri_allow_list','mailer_otp_exp']
    assert all(before.get(key)==after.get(key) for key in protected),'Authentication configuration changed'
    assert after.get('mailer_autoconfirm') is False,'Email confirmation must remain enabled'
    receipt={'provider':'Resend','domain':DOMAIN,'domainStatus':'verified','sender':SENDER,'senderName':'Answer with Books','smtpSettingsVerified':True,'newKeyRestrictedToDomain':bool(created),'smtpAuthenticationTested':bool(created),'newKeyId':created.get('id') if created else None,'emailLimitPerHour':30,'confirmationRequired':True,'emailsSent':0}
    print(json.dumps(receipt,indent=2))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true')
    connect(parser.parse_args().apply)
