-- First sign up through the connected app and verify your email.
-- Replace the email below with YOUR account, then run in Supabase SQL editor.
-- This deliberately fails if there is no unique verified account.
do $$
declare target uuid; matches integer;
begin
 select count(*),min(id::text)::uuid into matches,target from auth.users
 where lower(email)=lower('racharlagpt@gmail.com') and email_confirmed_at is not null;
 if matches<>1 then raise exception 'Expected one verified account. Sign up, verify email and replace the placeholder.'; end if;
 insert into public.rm_roles(user_id,role,display_name,enabled)
 values(target,'admin','Store owner',true)
 on conflict(user_id) do update set role='admin',enabled=true;
end $$;
