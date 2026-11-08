import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {bookUser} from '../_shared/book-cli-auth.mjs';
import {verifyStripeEvent,subscriptionState,validPlanPrice} from '../_shared/reader-subscription.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const check=(r:any)=>{if(r.error)throw Error('Database unavailable');return r.data;};
const site='https://answerwithbooks.com';
const origins=new Set([site,'https://www.answerwithbooks.com','http://localhost:4321','http://127.0.0.1:4321']);
const configured=()=>!!(Deno.env.get('AWB_STRIPE_SECRET_KEY')&&Deno.env.get('AWB_STRIPE_PRICE_ID')&&Deno.env.get('AWB_STRIPE_WEBHOOK_SECRET')&&Deno.env.get('AWB_STRIPE_PORTAL_CONFIGURATION_ID'));
async function stripe(path:string,data?:Record<string,string>,key?:string){
 const res=await fetch(`https://api.stripe.com/v1/${path}`,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${Deno.env.get('AWB_STRIPE_SECRET_KEY')}`,'Stripe-Version':'2024-06-20',...(data?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},body:data?new URLSearchParams(data):undefined,signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('Payment service unavailable');return res.json();
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:site,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 try{
 const raw=await req.text();if(raw.length>200000)return reply({error:'Request too large'},413);
 if(new URL(req.url).pathname.endsWith('/webhook')){
  if(!configured())return reply({error:'Payments are not configured'},503);
  let event;try{event=await verifyStripeEvent(raw,req.headers.get('stripe-signature'),Deno.env.get('AWB_STRIPE_WEBHOOK_SECRET'));}catch{return reply({error:'Invalid webhook signature'},400);}
  if(!/^(customer\.subscription\.(created|updated|deleted)|invoice\.(paid|payment_failed|payment_action_required)|checkout\.session\.completed)$/.test(event.type))return reply({received:true});
  const customer=event.data?.object?.customer;if(typeof customer!=='string')return reply({received:true});
  // Refresh canonical provider state; never apply an out-of-order event snapshot.
  for(let attempt=0;attempt<4;attempt++){
   const account=check(await db.from('reader_subscriptions').select('*').eq('customer_id',customer).maybeSingle());if(!account)return reply({received:true});
   if(check(await db.from('reader_subscription_events').select('id').eq('id',event.id).maybeSingle()))return reply({received:true});
   const list=await stripe(`subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=100&expand[]=data.latest_invoice`);
   if(list.has_more)throw Error('Subscription reconciliation requires operator review');
   const relevant=list.data.filter((s:any)=>s.items?.data?.some((i:any)=>i.price?.id===Deno.env.get('AWB_STRIPE_PRICE_ID'))).sort((a:any,b:any)=>b.created-a.created);
   const live=relevant.filter((s:any)=>!['canceled','incomplete_expired'].includes(s.status));
   if(live.length>1)throw Error('Multiple subscriptions require operator review');
   const chosen=live[0]||relevant[0],state=chosen?subscriptionState(chosen,Deno.env.get('AWB_STRIPE_PRICE_ID')):{subscription:null,status:'none',start:null,end:null,cancel:false};
   const applied=check(await db.rpc('apply_reader_subscription',{p_event:event.id,p_user:account.user_id,p_revision:account.revision,p_subscription:state.subscription,p_status:state.status,p_start:state.start,p_end:state.end,p_cancel:state.cancel}));
   if(applied)return reply({received:true});
  }
  return reply({error:'Retry reconciliation'},503);
 }
 const input=JSON.parse(raw);const user=await bookUser(db,req.headers.get('authorization')?.replace(/^Bearer /i,'')||'');
 if(!user)return reply({error:'Sign in to manage your plan.'},401);
 const plan=check(await db.rpc('reader_plan',{p_user:user.id}));
 if(input.action==='status')return reply({...plan,checkoutAvailable:configured()&&plan.tier!=='complimentary'});
 if(!['checkout','portal'].includes(input.action))return reply({error:'Unknown action'},400);
 if(plan.tier==='complimentary')return reply({error:'Your account already has complimentary access. No subscription payment is needed.'},409);
 if(!configured())return reply({error:'Subscription checkout is not available yet.'},503);
 let account=check(await db.from('reader_subscriptions').select('*').eq('user_id',user.id).maybeSingle());
 if(!account){const customer=await stripe('customers',{'metadata[awb_user_id]':user.id},`awb-reader-customer-${user.id}`);check(await db.from('reader_subscriptions').upsert({user_id:user.id,customer_id:customer.id},{onConflict:'user_id',ignoreDuplicates:true}));account=check(await db.from('reader_subscriptions').select('*').eq('user_id',user.id).single());}
 if(input.action==='portal')return reply({url:(await stripe('billing_portal/sessions',{customer:account.customer_id,configuration:Deno.env.get('AWB_STRIPE_PORTAL_CONFIGURATION_ID')!,return_url:site+'/billing/'})).url});
 const existing=await stripe(`subscriptions?customer=${encodeURIComponent(account.customer_id)}&status=all&limit=100`);
 if(existing.has_more||existing.data.some((s:any)=>!['canceled','incomplete_expired'].includes(s.status)))return reply({error:'You already have a subscription. Manage it from Billing.'},409);
 const price=await stripe(`prices/${encodeURIComponent(Deno.env.get('AWB_STRIPE_PRICE_ID')!)}`);if(!validPlanPrice(price))throw Error('Plan price misconfigured');
 const checkout=check(await db.rpc('reader_checkout_key',{p_user:user.id}));
 const session=await stripe('checkout/sessions',{mode:'subscription',expires_at:String(checkout.expires),customer:account.customer_id,'line_items[0][price]':price.id,'line_items[0][quantity]':'1','subscription_data[metadata][awb_user_id]':user.id,success_url:site+'/billing/?checkout=returned',cancel_url:site+'/billing/',client_reference_id:user.id},`awb-reader-checkout-${checkout.key}`);
 return reply({url:session.url});
 }catch{ return reply({error:'Could not update your plan. Please try again.'},503); }
});
