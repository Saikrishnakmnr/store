// PUBLIC configuration only. Never put service-role, Razorpay secret or Resend keys here.
window.STORE_CONFIG = {
  mode: 'preview', // Change to 'connected' only on a staging deployment after following DEPLOYMENT_GUIDE.md.
  supabaseUrl: '', // https://YOUR_PROJECT.supabase.co
  publishableKey: '' // Supabase publishable key, NOT sb_secret_ or service_role
};
