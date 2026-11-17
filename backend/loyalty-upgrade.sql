-- HOMLY loyalty upgrade (live schema applied Nov 17, 2026). Run after backend/schema.sql in a fresh environment.
BEGIN;
ALTER TABLE public.homly_loyalty_settings
 ADD COLUMN IF NOT EXISTS redeem_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS redeem_kopeks_per_point integer NOT NULL DEFAULT 100 CHECK(redeem_kopeks_per_point BETWEEN 1 AND 10000),
 ADD COLUMN IF NOT EXISTS redeem_max_percent integer NOT NULL DEFAULT 20 CHECK(redeem_max_percent BETWEEN 0 AND 90),
 ADD COLUMN IF NOT EXISTS signup_points integer NOT NULL DEFAULT 0 CHECK(signup_points BETWEEN 0 AND 10000),
 ADD COLUMN IF NOT EXISTS birthday_points integer NOT NULL DEFAULT 0 CHECK(birthday_points BETWEEN 0 AND 10000),
 ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE public.homly_orders
 ADD COLUMN IF NOT EXISTS redeemed_points integer NOT NULL DEFAULT 0 CHECK(redeemed_points>=0),
 ADD COLUMN IF NOT EXISTS redeemed_kopeks bigint NOT NULL DEFAULT 0 CHECK(redeemed_kopeks>=0),
 ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false;
ALTER TABLE public.homly_points_ledger ADD COLUMN IF NOT EXISTS bonus_year integer;
ALTER TABLE public.homly_profiles ADD COLUMN IF NOT EXISTS birthday_updated_at timestamptz;
UPDATE public.homly_profiles SET birthday_updated_at=now() WHERE birthday IS NOT NULL AND birthday_updated_at IS NULL;
ALTER TABLE public.homly_points_ledger DROP CONSTRAINT IF EXISTS homly_points_ledger_reason_check;
ALTER TABLE public.homly_points_ledger ADD CONSTRAINT homly_points_ledger_reason_check CHECK(reason IN ('purchase','refund','adjustment','redeem','restore','signup','birthday'));
CREATE UNIQUE INDEX IF NOT EXISTS homly_points_unique_redeem_idx ON public.homly_points_ledger(order_id) WHERE reason='redeem' AND order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS homly_points_unique_restore_idx ON public.homly_points_ledger(order_id) WHERE reason='restore' AND order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS homly_points_unique_signup_idx ON public.homly_points_ledger(user_id) WHERE reason='signup';
CREATE UNIQUE INDEX IF NOT EXISTS homly_points_unique_birthday_year_idx ON public.homly_points_ledger(user_id,bonus_year) WHERE reason='birthday';
CREATE INDEX IF NOT EXISTS homly_ledger_wallet_idx ON public.homly_points_ledger(user_id) INCLUDE(points);

CREATE OR REPLACE FUNCTION public.homly_birthday_change_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_op='INSERT' then
  if new.birthday is not null then new.birthday_updated_at=now(); end if;
 elsif new.birthday is distinct from old.birthday then
  new.birthday_updated_at=now();
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.homly_cancel_checkout(p_order_id uuid, p_state text DEFAULT 'failed'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order public.homly_orders%rowtype; v_item record;
begin
 if p_state not in ('failed','cancelled') then raise exception 'INVALID_STATE'; end if;
 select * into v_order from public.homly_orders where id=p_order_id for update;
 if not found then return false; end if;
 if v_order.status in ('failed','cancelled') then return true; end if;
 if v_order.status<>'pending' then return false; end if;
 if v_order.stock_reserved then
  for v_item in select product_id,quantity from public.homly_order_items where order_id=p_order_id loop
    update public.homly_products set stock=stock+v_item.quantity,updated_at=now()
     where id=v_item.product_id;
  end loop;
 end if;
 if v_order.redeemed_points>0 then
   insert into public.homly_points_ledger(user_id,order_id,points,reason)
   values(v_order.customer_id,p_order_id,v_order.redeemed_points,'restore')
   on conflict do nothing;
 end if;
 update public.homly_orders set status=p_state,stock_reserved=false where id=p_order_id;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.homly_claim_my_rewards()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=(select auth.uid());v_user auth.users%rowtype;
 v_settings public.homly_loyalty_settings%rowtype;
 v_profile public.homly_profiles%rowtype;
 v_today date:=(now() at time zone 'Europe/Kyiv')::date;
 v_awarded integer:=0;v_n integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_user from auth.users where id=v_uid;
 if not found or v_user.email_confirmed_at is null then
  raise exception 'EMAIL_NOT_VERIFIED';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,20261117));
 select * into v_settings from public.homly_loyalty_settings where id=1;
 if not found or not v_settings.enabled then return 0; end if;
 if v_settings.signup_points>0 and v_settings.activated_at is not null
    and v_user.created_at>=v_settings.activated_at then
   insert into public.homly_points_ledger(user_id,points,reason)
    values(v_uid,v_settings.signup_points,'signup') on conflict do nothing;
   get diagnostics v_n=row_count;
   v_awarded:=v_awarded+v_n*v_settings.signup_points;
 end if;
 select * into v_profile from public.homly_profiles where user_id=v_uid;
 if found and v_settings.birthday_points>0 and v_profile.birthday is not null
    and v_profile.birthday_updated_at<=now()-interval '30 days'
    and extract(month from v_profile.birthday)=extract(month from v_today)
    and extract(day from v_profile.birthday)=extract(day from v_today)
    and exists(select 1 from public.homly_orders
      where customer_id=v_uid and status='paid' and paid_at is not null) then
   insert into public.homly_points_ledger(user_id,points,reason,bonus_year)
    values(v_uid,v_settings.birthday_points,'birthday',extract(year from v_today)::integer)
    on conflict do nothing;
   get diagnostics v_n=row_count;
   v_awarded:=v_awarded+v_n*v_settings.birthday_points;
 end if;
 return v_awarded;
end $function$;

CREATE OR REPLACE FUNCTION public.homly_complete_order(p_order_id uuid, p_invoice_id text, p_amount_kopeks bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_order public.homly_orders%rowtype; v_item record;
 v_rule public.homly_loyalty_settings%rowtype; v_points integer:=0;
begin
 select * into v_order from public.homly_orders where id=p_order_id for update;
 if not found then return false; end if;
 if v_order.invoice_id is distinct from p_invoice_id
    or v_order.total_kopeks is distinct from p_amount_kopeks
 then raise exception 'INVOICE_AMOUNT_MISMATCH'; end if;
 if v_order.status='paid' then return true; end if;
 if v_order.status<>'pending' then return false; end if;
 if not v_order.stock_reserved then
   for v_item in select product_id,quantity from public.homly_order_items
      where order_id=p_order_id order by product_id loop
     update public.homly_products set stock=stock-v_item.quantity,updated_at=now()
       where id=v_item.product_id and stock>=v_item.quantity;
     if not found then raise exception 'STOCK_NOT_AVAILABLE'; end if;
   end loop;
 end if;
 select * into v_rule from public.homly_loyalty_settings where id=1;
 if found and v_rule.enabled then
   v_points:=round((p_amount_kopeks::numeric/100) * v_rule.earn_percent/100)::integer;
 end if;
 update public.homly_orders set status='paid',paid_at=now(),
    earned_points=v_points,stock_reserved=false where id=p_order_id;
 if v_points>0 then
  insert into public.homly_points_ledger(user_id,order_id,points,reason)
   values(v_order.customer_id,p_order_id,v_points,'purchase') on conflict do nothing;
 end if;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.homly_loyalty_activation_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.enabled=true and old.enabled=false and new.activated_at is null then
  new.activated_at=now();
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.homly_my_points()
 RETURNS bigint
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select coalesce(sum(points::bigint),0)
 from public.homly_points_ledger where user_id=(select auth.uid())
 $function$;

CREATE OR REPLACE FUNCTION public.homly_reserve_checkout(p_customer uuid, p_email text, p_items jsonb, p_delivery jsonb, p_redeem integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_row record; v_product public.homly_products%rowtype;
 v_order uuid; v_subtotal bigint := 0; v_discount bigint := 0;
 v_rule public.homly_loyalty_settings%rowtype; v_available bigint;
 v_items jsonb := '[]'::jsonb; v_seen text[] := '{}';
 v_count integer;
begin
 if p_customer is null or p_email is null or length(p_email)>320
    or p_redeem is null or p_redeem<0 or p_redeem>1000000
    or p_items is null or jsonb_typeof(p_items)<>'array'
    or p_delivery is null or jsonb_typeof(p_delivery)<>'object'
 then raise exception 'INVALID_CHECKOUT'; end if;
 v_count:=jsonb_array_length(p_items);
 if v_count<1 or v_count>15 then raise exception 'INVALID_ITEMS'; end if;
 if length(coalesce(p_delivery->>'name','')) not between 3 and 120
    or length(coalesce(p_delivery->>'phone','')) not between 9 and 30
    or length(coalesce(p_delivery->>'city','')) not between 2 and 120
    or length(coalesce(p_delivery->>'branch','')) not between 2 and 160
 then raise exception 'INVALID_DELIVERY'; end if;
 -- All concurrent spends by one user serialize, including credits/refunds.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_customer::text, 20261117));
 select * into v_rule from public.homly_loyalty_settings where id=1;
 -- Lock inventory in a stable sequence to avoid cross-basket deadlocks.
 for v_row in
   select elem->>'slug' slug, elem->'quantity' qty,
          elem data
   from jsonb_array_elements(p_items) elem
   order by elem->>'slug'
 loop
   if jsonb_typeof(v_row.data)<>'object'
      or v_row.slug is null
      or v_row.slug !~ '^[a-z0-9][a-z0-9-]{1,70}$'
      or v_row.slug=any(v_seen)
      or jsonb_typeof(v_row.qty)<>'number'
      or (v_row.qty::text)!~ '^[0-9]+$'
      or (v_row.qty::text)::integer not between 1 and 20
   then raise exception 'INVALID_ITEM'; end if;
   v_seen:=array_append(v_seen,v_row.slug);
   select * into v_product from public.homly_products
    where slug=v_row.slug and published for update;
   if not found or v_product.stock<(v_row.qty::text)::integer
   then raise exception 'OUT_OF_STOCK_OR_UNPUBLISHED'; end if;
   v_subtotal:=v_subtotal+v_product.price_kopeks::bigint*(v_row.qty::text)::integer;
   v_items:=v_items || jsonb_build_array(jsonb_build_object(
      'id',v_product.id,'title',v_product.title,'quantity',(v_row.qty::text)::integer,
      'price',v_product.price_kopeks,'total',v_product.price_kopeks::bigint*(v_row.qty::text)::integer
    ));
 end loop;
 if v_subtotal<100 or v_subtotal>100000000 then raise exception 'INVALID_TOTAL'; end if;
 if p_redeem>0 then
   if not coalesce(v_rule.redeem_enabled,false)
   then raise exception 'REDEEM_NOT_ENABLED'; end if;
   select coalesce(sum(points::bigint),0) into v_available
     from public.homly_points_ledger where user_id=p_customer;
   v_discount:=p_redeem::bigint*v_rule.redeem_kopeks_per_point;
   if v_available<p_redeem
      or v_discount>v_subtotal*v_rule.redeem_max_percent/100
      or v_subtotal-v_discount<100
   then raise exception 'INSUFFICIENT_POINTS_OR_LIMIT'; end if;
 end if;
 insert into public.homly_orders
  (customer_id,customer_email,status,subtotal_kopeks,total_kopeks,delivery,
    redeemed_points,redeemed_kopeks,stock_reserved)
 values(p_customer,p_email,'pending',v_subtotal,v_subtotal-v_discount,p_delivery,
    p_redeem,v_discount,true) returning id into v_order;
 for v_row in select * from jsonb_array_elements(v_items) x(elem) loop
  insert into public.homly_order_items
    (order_id,product_id,title,quantity,price_kopeks,total_kopeks)
  values(v_order,(v_row.elem->>'id')::uuid,v_row.elem->>'title',
    (v_row.elem->>'quantity')::integer,(v_row.elem->>'price')::integer,
    (v_row.elem->>'total')::bigint);
  update public.homly_products
    set stock=stock-(v_row.elem->>'quantity')::integer,updated_at=now()
    where id=(v_row.elem->>'id')::uuid;
 end loop;
 if p_redeem>0 then
  insert into public.homly_points_ledger(user_id,order_id,points,reason)
   values(p_customer,v_order,-p_redeem,'redeem');
 end if;
 return jsonb_build_object('order_id',v_order,'subtotal_kopeks',v_subtotal,
    'total_kopeks',v_subtotal-v_discount,'redeemed_points',p_redeem,
    'redeemed_kopeks',v_discount,'basket',v_items);
end $function$;

CREATE OR REPLACE FUNCTION public.homly_reverse_paid_order(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order public.homly_orders%rowtype;
begin
 select * into v_order from public.homly_orders where id=p_order_id for update;
 if not found then return false; end if;
 if v_order.status='refunded' then return true; end if;
 if v_order.status<>'paid' then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_order.customer_id::text,20261117));
 if v_order.earned_points>0 then
  insert into public.homly_points_ledger(user_id,order_id,points,reason)
    values(v_order.customer_id,p_order_id,-v_order.earned_points,'refund')
    on conflict do nothing;
 end if;
 if v_order.redeemed_points>0 then
  insert into public.homly_points_ledger(user_id,order_id,points,reason)
    values(v_order.customer_id,p_order_id,v_order.redeemed_points,'restore')
    on conflict do nothing;
 end if;
 update public.homly_orders set status='refunded' where id=p_order_id;
 return true;
end $function$;


DROP TRIGGER IF EXISTS homly_loyalty_activation_guard ON public.homly_loyalty_settings;
CREATE TRIGGER homly_loyalty_activation_guard BEFORE UPDATE ON public.homly_loyalty_settings
 FOR EACH ROW EXECUTE FUNCTION public.homly_loyalty_activation_guard();
DROP TRIGGER IF EXISTS homly_birthday_change_guard ON public.homly_profiles;
CREATE TRIGGER homly_birthday_change_guard BEFORE INSERT OR UPDATE ON public.homly_profiles
 FOR EACH ROW EXECUTE FUNCTION public.homly_birthday_change_guard();
REVOKE ALL ON FUNCTION public.homly_reserve_checkout(uuid,text,jsonb,jsonb,integer) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.homly_cancel_checkout(uuid,text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.homly_complete_order(uuid,text,bigint) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.homly_reverse_paid_order(uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.homly_reserve_checkout(uuid,text,jsonb,jsonb,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.homly_cancel_checkout(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.homly_complete_order(uuid,text,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.homly_reverse_paid_order(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.homly_my_points() FROM public,anon;
REVOKE ALL ON FUNCTION public.homly_claim_my_rewards() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.homly_my_points() TO authenticated;
GRANT EXECUTE ON FUNCTION public.homly_claim_my_rewards() TO authenticated;
COMMIT;
