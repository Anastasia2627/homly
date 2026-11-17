-- HOMLY bank reconciliation: cron secret stored ONLY in Supabase Vault.
create extension if not exists pg_net with schema extensions;
alter table public.homly_orders
  add column if not exists last_bank_check_at timestamptz,
  add column if not exists bank_review_reason text;
create index if not exists homly_orders_pending_reconcile_idx
 on public.homly_orders(last_bank_check_at nulls first,created_at)
 where status='pending' and invoice_id is not null;
create or replace function public.homly_verify_cron_token(p_token text)
returns boolean language sql stable security definer set search_path=''
as $$
 select p_token is not null and length(p_token)=64 and
        p_token ~ '^[a-f0-9]{64}$' and
        exists(select 1 from vault.decrypted_secrets
          where name='homly_reconcile_cron' and decrypted_secret=p_token)
$$;
revoke all on function public.homly_verify_cron_token(text) from public,anon,authenticated;
grant execute on function public.homly_verify_cron_token(text) to service_role;
do $$
begin
 if not exists (select 1 from vault.secrets where name='homly_reconcile_cron') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),
   'homly_reconcile_cron','Private authorization for HOMLY scheduled bank reconciliation');
 end if;
end $$;
select cron.schedule('homly-reconcile-pending-invoices','*/10 * * * *',
 $job$
 select net.http_post(
  url:='https://rdwcymfjktxbyoidyhax.supabase.co/functions/v1/homly-reconcile-pending',
  headers:=jsonb_build_object('Content-Type','application/json',
   'X-Homly-Cron',(select decrypted_secret from vault.decrypted_secrets where name='homly_reconcile_cron')),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 );
 $job$);
