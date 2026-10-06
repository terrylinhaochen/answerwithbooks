const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-newsletter-email]'));
const url=import.meta.env.PUBLIC_SUPABASE_URL, key=import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
for(const root of roots) {
 const form=root.querySelector<HTMLFormElement>('form')!, input=form.querySelector<HTMLInputElement>('[name=email]')!, button=form.querySelector<HTMLButtonElement>('[type=submit]')!, status=root.querySelector<HTMLElement>('[data-newsletter-status]')!;
 let busy=false;button.disabled=!url||!key;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;input.value=input.value.trim();if(!form.reportValidity())return;
  busy=true;button.disabled=true;button.textContent='Saving…';status.textContent='';
  try {
   const response=await fetch(`${url}/functions/v1/newsletter-signup`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify({email:input.value.toLowerCase(),consent:true,consentVersion:'awb-newsletter-v1',sourcePath:location.pathname,website:new FormData(form).get('website')||''}),signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok||result.accepted!==true)throw new Error(response.status===429?'Too many attempts. Please try again later.':'We could not save your subscription. Please retry.');
   status.textContent='Your newsletter request is saved. No account was created and no sign-in email was requested. Existing opt-outs are preserved.';status.dataset.error='false';button.textContent='Saved';input.disabled=true;
  } catch(error) {status.textContent=error instanceof Error?error.message:'Subscription failed. Please retry.';status.dataset.error='true';button.disabled=false;button.textContent=root.dataset.submitLabel||'Subscribe';}
  finally {busy=false;}
 });
}
