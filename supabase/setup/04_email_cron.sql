-- OPTIONAL: run only after email-worker works manually in a STAGING project.
-- Enable pg_cron and pg_net through Supabase Database > Extensions first.
-- In Supabase Vault create secrets named:
--   store_email_worker_url = https://PROJECT.supabase.co/functions/v1/email-worker
--   store_email_worker_token = the SAME EMAIL_WORKER_SECRET set on the Edge Functions.
-- Never put the actual secret into GitHub or this SQL file.
select cron.schedule(
 'store-email-outbox-every-five-minutes','*/5 * * * *',
 $job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='store_email_worker_url' limit 1),
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='store_email_worker_token' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=10000
 );
 $job$
);
-- Check cron.job_run_details and net._http_response; scheduling is not proof of delivery.
-- To pause this job: select cron.unschedule('store-email-outbox-every-five-minutes');
