-- Daily automatic rewards; runs only if HOMLY owner enabled points.
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.homly_award_scheduled_rewards()
 returns integer language plpgsql security definer set search_path=''
as $$
declare
 v_rule public.homly_loyalty_settings%rowtype;
 v_today date:=(now() at time zone 'Europe/Kyiv')::date;
 v_count integer:=0;v_new integer:=0;
begin
 select * into v_rule from public.homly_loyalty_settings where id=1;
 if not found or not v_rule.enabled then return 0; end if;
 if v_rule.signup_points>0 and v_rule.activated_at is not null then
  insert into public.homly_points_ledger(user_id,points,reason)
   select u.id,v_rule.signup_points,'signup'
   from auth.users u
   where u.email_confirmed_at is not null and u.created_at>=v_rule.activated_at
   on conflict do nothing;
  get diagnostics v_new=row_count;v_count:=v_count+v_new;
 end if;
 if v_rule.birthday_points>0 then
  insert into public.homly_points_ledger(user_id,points,reason,bonus_year)
   select p.user_id,v_rule.birthday_points,'birthday',extract(year from v_today)::integer
   from public.homly_profiles p
   join auth.users u on u.id=p.user_id
   where u.email_confirmed_at is not null
    and p.birthday is not null
    and p.birthday_updated_at <=now()-interval '30 days'
    and extract(month from p.birthday)=extract(month from v_today)
    and extract(day from p.birthday)=extract(day from v_today)
    and exists(select 1 from public.homly_orders o
     where o.customer_id=p.user_id and o.status='paid' and o.paid_at is not null)
   on conflict do nothing;
  get diagnostics v_new=row_count;v_count:=v_count+v_new;
 end if;
 return v_count;
end $$;
revoke all on function public.homly_award_scheduled_rewards() from public,anon,authenticated;
grant execute on function public.homly_award_scheduled_rewards() to service_role;
select cron.schedule('homly-daily-rewards','10 7 * * *','select public.homly_award_scheduled_rewards();');
