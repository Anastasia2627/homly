-- Restrict Data API grants independently from RLS.
-- Do NOT change the service_role grants used by server-side payment functions.
revoke all on table
 public.homly_admins,
 public.homly_profiles,
 public.homly_products,
 public.homly_orders,
 public.homly_order_items,
 public.homly_points_ledger,
 public.homly_loyalty_settings,
 public.homly_tracking_settings,
 public.homly_store_settings,
 public.homly_email_outbox,
 public.homly_telegram_outbox
from public,anon,authenticated;

grant select on table
 public.homly_products,
 public.homly_loyalty_settings,
 public.homly_tracking_settings,
 public.homly_store_settings
to anon;

grant select on table
 public.homly_admins,
 public.homly_profiles,
 public.homly_products,
 public.homly_orders,
 public.homly_order_items,
 public.homly_points_ledger,
 public.homly_loyalty_settings,
 public.homly_tracking_settings,
 public.homly_store_settings
to authenticated;

grant insert,update on table public.homly_profiles to authenticated;
grant insert,update,delete on table public.homly_products to authenticated;
grant update on table
 public.homly_loyalty_settings,
 public.homly_tracking_settings,
 public.homly_store_settings
to authenticated;

-- Preserve server-only transaction and notification processing.
grant select,insert,update,delete on table
 public.homly_admins,
 public.homly_profiles,
 public.homly_products,
 public.homly_orders,
 public.homly_order_items,
 public.homly_points_ledger,
 public.homly_loyalty_settings,
 public.homly_tracking_settings,
 public.homly_store_settings,
 public.homly_email_outbox,
 public.homly_telegram_outbox
to service_role;
