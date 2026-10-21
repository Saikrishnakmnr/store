-- Execute in a staging SQL editor after setup. No persistent changes.
-- These test direct DB denial only, NOT the Edge function's customer/rider behavior.
begin;
set local role anon;
do $$ begin
 begin perform 1 from public.rm_orders; raise exception 'FAIL: anon read was allowed';
 exception when insufficient_privilege then raise notice 'PASS: anon order read denied'; end;
 begin perform public.rm_commit(0,'{}'::jsonb,null,null,'[]'::jsonb); raise exception 'FAIL: anon RPC allowed';
 exception when insufficient_privilege then raise notice 'PASS: anon private RPC denied'; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
 begin insert into public.rm_roles(user_id,role,display_name) values(gen_random_uuid(),'admin','test'); raise exception 'FAIL: customer role insert allowed';
 exception when insufficient_privilege then raise notice 'PASS: customer role escalation denied'; end;
 begin perform public.rm_commit(0,'{}'::jsonb,null,null,'[]'::jsonb); raise exception 'FAIL: customer RPC allowed';
 exception when insufficient_privilege then raise notice 'PASS: customer private RPC denied'; end;
end $$;
rollback;
