-- OPTIONAL: DO NOT execute until a verified admin phone receives a test push.
-- Use existing Supabase Free project only if pg_cron/pg_net available at no charge.
-- Vault secrets must be configured independently; never commit or paste tokens into SQL files.
--   rm_push_worker_url = https://<project-ref>.supabase.co/functions/v1/admin-push-worker
--   rm_push_worker_token = a new secure PUSH_WORKER_SECRET
-- Review pending job duplication before running.
select cron.schedule('rm-admin-push-every-minute','* * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='rm_push_worker_url' limit 1),
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='rm_push_worker_token' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=15000);
$job$);
-- Rollback: select cron.unschedule('rm-admin-push-every-minute');
