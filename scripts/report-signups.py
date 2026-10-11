"""Private aggregate account report. Uses Supabase operator access; never lists emails or tokens."""
import argparse, importlib.util, json, sys
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
ROOT = Path(__file__).resolve().parents[1]

def report(days=30, timezone='America/Los_Angeles'):
    if not 1 <= days <= 365: raise ValueError('Days must be between 1 and 365.')
    ZoneInfo(timezone)
    spec=importlib.util.spec_from_file_location('deployment', ROOT/'scripts/deploy-book-agent-import.py')
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    query=module.management()
    zone="'"+timezone.replace("'","''")+"'"
    # Legacy fixtures have reserved test domains or the old test-mailbox plus tag.
    # An operator-owned app_metadata flag handles future test accounts; user metadata
    # must never decide whether an account is a test or has any privileged access.
    base="""with classified as (
      select u.id, u.created_at, u.email_confirmed_at, u.last_sign_in_at,
        coalesce(u.raw_user_meta_data->'awb_signup'->>'product'='answerwithbooks',false) as attributed,
        case when u.raw_user_meta_data->'awb_signup'->>'entrypoint' in ('website','agent','shelf','onboarding','upload','tools')
          then u.raw_user_meta_data->'awb_signup'->>'entrypoint' else 'unknown' end as entrypoint,
        coalesce(u.is_anonymous,false) as anonymous,
        coalesce(u.raw_app_meta_data->>'awb_test_account'='true',false)
          or coalesce(u.email ~* '(@example[.](com|org|net|test|invalid)$|[.](invalid|test)$|[+]awb-test-)',false) as fixture
      from auth.users u where u.deleted_at is null
    ), accounts as (select * from classified where not fixture and not anonymous) """
    totals=query(base+"""select
      (select count(*) from classified)::int as project_accounts,
      (select count(*) from classified where fixture)::int as excluded_test_accounts,
      (select count(*) from classified where anonymous and not fixture)::int as excluded_anonymous_accounts,
      count(*)::int as accounts_excluding_tests,
      count(*) filter(where email_confirmed_at is not null)::int as confirmed_accounts,
      count(*) filter(where email_confirmed_at is null)::int as unconfirmed_accounts,
      count(*) filter(where attributed)::int as attributed_awb_signups,
      count(*) filter(where not attributed)::int as legacy_or_unattributed_accounts,
      count(*) filter(where created_at >= now()-interval '7 days')::int as new_accounts_last_7_days,
      count(*) filter(where last_sign_in_at >= now()-interval '7 days')::int as signed_in_last_7_days,
      count(*) filter(where exists(select 1 from public.book_cli_sessions s where s.user_id=accounts.id and s.expires_at>now()))::int as currently_connected_to_agent,
      count(*) filter(where exists(select 1 from public.book_processing_jobs b where b.user_id=accounts.id and b.status='ready'))::int as accounts_with_ready_books
      from accounts""",True)[0]
    daily=query(base+f""", days as (
      select generate_series((now() at time zone {zone})::date-({days}-1),(now() at time zone {zone})::date,interval '1 day')::date as day
    ) select d.day::text, count(a.id)::int as accounts_created,
      count(a.id) filter(where a.email_confirmed_at is not null)::int as confirmed_by_now,
      count(a.id) filter(where a.attributed)::int as attributed_awb_signups
      from days d left join accounts a on (a.created_at at time zone {zone})::date=d.day
      group by d.day order by d.day""",True)
    sources=query(base+"select case when attributed then entrypoint else 'legacy-or-unattributed' end as entrypoint,count(*)::int as accounts from accounts group by 1 order by 1",True)
    return {'timezone':timezone,'days':days,'totals':totals,'daily_signup_cohorts':daily,'entrypoints':sources,
      'notes':['Current accounts only; deleted accounts are not retained in this report.',
        'Legacy project accounts are not automatically claimed as Answer with Books signups.',
        'Entrypoint metadata is self-reported attribution, never an authorization signal.',
        'confirmed_by_now counts confirmations within each creation-date cohort, not confirmation events on that day.',
        'Agent connections are currently unexpired sessions, not historical activation totals.']}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--days',type=int,default=30);parser.add_argument('--timezone',default='America/Los_Angeles');parser.add_argument('--json',action='store_true')
    args=parser.parse_args()
    try: result=report(args.days,args.timezone)
    except (ValueError,ZoneInfoNotFoundError) as e: parser.error(str(e))
    except Exception: print('Could not read the signup report. Check operator access; no account data was changed.',file=sys.stderr);sys.exit(1)
    if args.json: print(json.dumps(result,indent=2))
    else:
        print('Answer with Books account report ('+args.timezone+')')
        for key,value in result['totals'].items(): print(f'{key.replace("_"," ")}: {value}')
        print('\nCreation date   New   Confirmed now   Attributed to AWB')
        for row in result['daily_signup_cohorts']: print(f"{row['day']}     {row['accounts_created']:3}             {row['confirmed_by_now']:3}                 {row['attributed_awb_signups']:3}")
        print('\n'+'\n'.join(result['notes']))
