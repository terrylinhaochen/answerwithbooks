export async function verifyStripeEvent(raw,signature,secret,now=Date.now()) {
 if(!secret||!signature)throw Error('Invalid signature');
 const parts=signature.split(',').map(p=>p.split('=')), timestamp=parts.find(([k])=>k==='t')?.[1];
 if(!/^\d+$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)throw Error('Expired signature');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=new TextEncoder().encode(`${timestamp}.${raw}`);
 let valid=false;for(const [k,v] of parts)if(k==='v1'&&/^[a-f0-9]{64}$/.test(v))valid=await crypto.subtle.verify('HMAC',key,Uint8Array.from(v.match(/../g),x=>parseInt(x,16)),bytes)||valid;
 if(!valid)throw Error('Invalid signature');return JSON.parse(raw);
}
export function subscriptionState(sub,priceId){
 const items=sub.items?.data||[],item=items[0],invoice=sub.latest_invoice;
 const valid=items.length===1&&item.price?.id===priceId&&item.quantity===1&&item.price?.currency==='usd'&&item.price?.unit_amount===2400&&item.price?.recurring?.interval==='month'&&item.price?.recurring?.interval_count===1;
 const start=sub.current_period_start??item?.current_period_start,end=sub.current_period_end??item?.current_period_end;
 const paid=invoice&&typeof invoice==='object'&&invoice.status==='paid';
 return {subscription:sub.id,status:valid&&paid&&sub.status==='active'?'active':sub.status==='active'?'unpaid':sub.status,
 start:Number.isSafeInteger(start)?new Date(start*1000).toISOString():null,end:Number.isSafeInteger(end)?new Date(end*1000).toISOString():null,cancel:sub.cancel_at_period_end===true};
}
export function validPlanPrice(price){return price.active&&price.currency==='usd'&&price.unit_amount===2400&&price.recurring?.interval==='month'&&price.recurring?.interval_count===1;}
