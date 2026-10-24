// PUBLIC configuration only. Never put service-role, Razorpay secret or Resend keys here.
window.STORE_CONFIG = {
  mode: 'connected', // Change to 'connected' only on a staging deployment after following DEPLOYMENT_GUIDE.md.
  supabaseUrl: 'https://qqoaxdunfgfytgvpjnxs.supabase.co', // https://YOUR_PROJECT.supabase.co
  publishableKey: 'sb_publishable_JhSdED9Eqd_UD9OTQcdXKw_SkgnSQY-' // Supabase publishable key, NOT sb_secret_ or service_role
};
