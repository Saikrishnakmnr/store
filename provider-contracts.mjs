// SERVER ONLY. Helpers, not complete payment/refund/email endpoints.
// Never import this module into dist/. No credentials are stored here.
const encoder=new TextEncoder();
function secret(value){if(typeof value!=='string'||value.length<8||/[\r\n]/.test(value))throw Error('Missing or invalid server secret.');return value;}
async function hmac(raw,key){const cryptoKey=await crypto.subtle.importKey('raw',encoder.encode(secret(key)),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,typeof raw==='string'?encoder.encode(raw):raw));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
function equalHex(a,b){if(!/^[a-f0-9]{64}$/i.test(a||'')||!/^[a-f0-9]{64}$/i.test(b||''))return false;let difference=0;for(let i=0;i<64;i++)difference|=a.toLowerCase().charCodeAt(i)^b.toLowerCase().charCodeAt(i);return difference===0;}
export async function verifyCheckoutSignature(result,storedOrderId,keySecret){
 if(!/^order_[A-Za-z0-9]+$/.test(storedOrderId||'')||result.razorpay_order_id!==storedOrderId||!/^pay_[A-Za-z0-9]+$/.test(result.razorpay_payment_id||''))return false;
 return equalHex(await hmac(storedOrderId+'|'+result.razorpay_payment_id,keySecret),result.razorpay_signature);
}
export async function verifyWebhookSignature(rawBody,signature,webhookSecret){return equalHex(await hmac(rawBody,webhookSecret),signature);}
export function assertCapturedPayment(payment,expected){
 if(!Number.isSafeInteger(expected.amountPaise)||expected.amountPaise<=0||expected.currency!=='INR')throw Error('Invalid stored payment expectation.');
 if(payment.order_id!==expected.orderId||payment.amount!==expected.amountPaise||payment.currency!==expected.currency||payment.status!=='captured'||payment.captured!==true)throw Error('Payment is not a verified capture for this order.');
 if(expected.paymentId&&payment.id!==expected.paymentId)throw Error('Payment identity mismatch.');return true;
}
export function resendRequest({apiKey,from,to,eventId,subject,html}){
 secret(apiKey);if(!from||!to||/[\r\n]/.test(from+to)||!from.includes('@')||!to.includes('@'))throw Error('Invalid email addresses.');
 if(!/^[A-Za-z0-9_-]{1,180}$/.test(eventId||''))throw Error('A durable event ID is required.');
 if(typeof subject!=='string'||subject.length>200||/[\r\n]/.test(subject)||typeof html!=='string')throw Error('Invalid email content.');
 return {url:'https://api.resend.com/emails',options:{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'order-event/'+eventId},body:JSON.stringify({from,to:[to],subject,html})}};
}
