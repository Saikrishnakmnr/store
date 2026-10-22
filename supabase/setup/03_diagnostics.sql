-- Read-only checks. Run after 01_connected_store.sql, then inspect every result.
select table_name from information_schema.tables
where table_schema='public' and table_name in ('rm_store','rm_roles','rm_orders','rm_outbox','rm_rate_limits') order by table_name;
-- Expected: five rows, all RLS true, both browser write columns false.
select c.relname as table_name,c.relrowsecurity as rls_enabled,
 has_table_privilege('anon',c.oid,'INSERT') as anon_can_insert,
 has_table_privilege('authenticated',c.oid,'INSERT') as customer_can_insert
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('rm_store','rm_roles','rm_orders','rm_outbox','rm_rate_limits');
-- Expected: anon/authenticated cannot execute the three private RPCs; service_role can.
select p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as customer_can_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') as server_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('rm_commit','rm_throttle','rm_claim_email');
-- Expected: product-images public true, ebooks public false.
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('product-images','ebooks');
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='storage' and tablename='objects' order by policyname;
-- Review ALL storage policies: existing broad policies can defeat these restrictions.
select role,enabled,count(*) from public.rm_roles group by role,enabled;
select version,state->>'storeMode' as mode,jsonb_array_length(state->'products') as products from public.rm_store;
select state,count(*),min(created_at) as oldest from public.rm_outbox group by state;
-- PostgREST reload after intentional schema changes, if needed:
-- notify pgrst, 'reload schema';
