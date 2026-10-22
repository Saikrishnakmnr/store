// Not yet wired to the preview. Supply the official Supabase SDK's createClient.
// Production API endpoints must independently verify the authenticated session.
export function authAdapter({createClient,url,publishableKey,redirectUrl}){
 const project=new URL(url),redirect=new URL(redirectUrl);
 if(project.protocol!=='https:'||redirect.protocol!=='https:')throw Error('Production auth URLs must use HTTPS.');
 if(!publishableKey||publishableKey.startsWith('sb_secret_'))throw Error('Use only a Supabase publishable/anon key in the browser.');
 if(publishableKey.split('.').length===3){try{const part=publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');if(JSON.parse(atob(part)).role==='service_role')throw Error('SERVICE_ROLE');}catch(e){if(e.message==='SERVICE_ROLE')throw Error('Service-role keys must never enter browser code.');}}
 const client=createClient(project.origin,publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return {
  client,
  google:()=>client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect.href}}),
  signUp:(email,password)=>client.auth.signUp({email,password,options:{emailRedirectTo:redirect.href}}),
  signIn:(email,password)=>client.auth.signInWithPassword({email,password}),
  resetPassword:email=>client.auth.resetPasswordForEmail(email,{redirectTo:redirect.href}),
  resendConfirmation:email=>client.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect.href}}),
  signOut:()=>client.auth.signOut()
 };
}
