-- HOMLY prelaunch server-controlled payment lock. Applied to HOMLY Supabase 2026-11-17.
-- This switch never turns on automatically merely because a bank token is saved.
CREATE TABLE IF NOT EXISTS public.homly_store_settings(
 id integer PRIMARY KEY DEFAULT 1 CHECK (id=1),
 checkout_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.homly_store_settings(id,checkout_enabled) VALUES(1,false)
 ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.homly_store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS homly_store_settings_public_read ON public.homly_store_settings;
CREATE POLICY homly_store_settings_public_read ON public.homly_store_settings
 FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS homly_store_settings_admin_update ON public.homly_store_settings;
CREATE POLICY homly_store_settings_admin_update ON public.homly_store_settings
 FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.homly_admins a WHERE a.user_id=(SELECT auth.uid())))
 WITH CHECK(EXISTS(SELECT 1 FROM public.homly_admins a WHERE a.user_id=(SELECT auth.uid())));
REVOKE ALL ON public.homly_store_settings FROM public,anon,authenticated;
GRANT SELECT ON public.homly_store_settings TO anon,authenticated;
GRANT UPDATE ON public.homly_store_settings TO authenticated;
-- The checkout Edge Function explicitly requires checkout_enabled=true,
-- on top of a valid customer JWT, an active bank token and full server checks.
-- Do not flip until merchant payment/refund tests and real products are approved.
