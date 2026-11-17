-- HOMLY shipping operations: owner-only delivery state and buyer dispatch email.
-- No change to bank-settled order payment status or loyalty balances.
alter table public.homly_orders
  add column if not exists fulfillment_status text not null default 'new',
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;
alter table public.homly_orders
  drop constraint if exists homly_orders_fulfillment_status_check;
alter table public.homly_orders
  add constraint homly_orders_fulfillment_status_check
  check (fulfillment_status in ('new','packing','shipped','delivered'));
alter table public.homly_orders
  drop constraint if exists homly_orders_tracking_number_check;
alter table public.homly_orders
  add constraint homly_orders_tracking_number_check
  check (tracking_number is null or tracking_number ~ '^[0-9]{14}$');
alter table public.homly_email_outbox
  drop constraint if exists homly_email_outbox_template_check;
alter table public.homly_email_outbox
  add constraint homly_email_outbox_template_check
  check (template in ('buyer_paid','owner_paid','buyer_refunded','buyer_shipped'));

create or replace function public.homly_update_fulfillment(
 p_order_id uuid,p_fulfillment_status text,p_tracking_number text default null
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.homly_orders%rowtype;
  v_tracking text := nullif(trim(coalesce(p_tracking_number,'')),'');
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.homly_admins where user_id = (select auth.uid())
  ) then raise exception 'OWNER_ONLY' using errcode='42501'; end if;
  if p_fulfillment_status is null or
      p_fulfillment_status not in ('new','packing','shipped','delivered')
  then raise exception 'INVALID_FULFILLMENT_STATUS'; end if;
  if v_tracking is not null and v_tracking !~ '^[0-9]{14}$'
  then raise exception 'INVALID_TRACKING_NUMBER'; end if;
  if p_fulfillment_status in ('shipped','delivered') and v_tracking is null
  then raise exception 'TRACKING_NUMBER_REQUIRED'; end if;
  select * into v_order from public.homly_orders where id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  if v_order.fulfillment_status = 'delivered' and p_fulfillment_status <> 'delivered'
  then raise exception 'DELIVERY_CANNOT_BE_REOPENED'; end if;
  if v_order.fulfillment_status in ('shipped','delivered') and
     p_fulfillment_status in ('new','packing')
  then raise exception 'CANNOT_UNSHIP_ORDER'; end if;
  update public.homly_orders set
   fulfillment_status=p_fulfillment_status,
   tracking_number=v_tracking,
   shipped_at=case when p_fulfillment_status in ('shipped','delivered')
     then coalesce(shipped_at,now()) else null end,
   delivered_at=case when p_fulfillment_status='delivered'
     then coalesce(delivered_at,now()) else null end
  where id=p_order_id;
  return jsonb_build_object(
    'id',p_order_id,'fulfillment_status',p_fulfillment_status,
    'tracking_number',v_tracking
  );
end;
$$;
revoke all on function public.homly_update_fulfillment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.homly_update_fulfillment(uuid,text,text) to authenticated;
create or replace function public.homly_enqueue_shipping_email()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.status='paid' and new.fulfillment_status='shipped' and
    old.fulfillment_status is distinct from 'shipped' then
  insert into public.homly_email_outbox(order_id,template)
    values(new.id,'buyer_shipped') on conflict(order_id,template) do nothing;
 end if;
 return new;
end;
$$;
revoke all on function public.homly_enqueue_shipping_email() from public,anon,authenticated;
drop trigger if exists homly_order_shipped_email on public.homly_orders;
create trigger homly_order_shipped_email
  after update of fulfillment_status on public.homly_orders
  for each row execute function public.homly_enqueue_shipping_email();
