-- Transactional HOMLY email queue: one notification per order and event.
CREATE TABLE IF NOT EXISTS public.homly_email_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.homly_orders(id) ON DELETE RESTRICT,
 template text NOT NULL CHECK (template IN ('buyer_paid','owner_paid','buyer_refunded')),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 12),
 created_at timestamptz NOT NULL DEFAULT now(),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_attempt_at timestamptz,
 sent_at timestamptz,
 provider_message_id text,
 last_error text,
 UNIQUE(order_id,template)
);
ALTER TABLE public.homly_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.homly_email_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.homly_email_outbox TO service_role;
CREATE INDEX IF NOT EXISTS homly_email_ready_idx
 ON public.homly_email_outbox(next_attempt_at,created_at)
 WHERE state='pending' AND attempts<12;

CREATE OR REPLACE FUNCTION public.homly_enqueue_order_email()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF new.status='paid' AND old.status IS DISTINCT FROM new.status THEN
  INSERT INTO public.homly_email_outbox(order_id,template)
   VALUES(new.id,'buyer_paid'),(new.id,'owner_paid')
   ON CONFLICT(order_id,template) DO NOTHING;
 ELSIF new.status='refunded' AND old.status IS DISTINCT FROM new.status THEN
  INSERT INTO public.homly_email_outbox(order_id,template)
   VALUES(new.id,'buyer_refunded')
   ON CONFLICT(order_id,template) DO NOTHING;
 END IF;
 RETURN new;
END $$;
DROP TRIGGER IF EXISTS homly_order_email_outbox ON public.homly_orders;
CREATE TRIGGER homly_order_email_outbox AFTER UPDATE OF status ON public.homly_orders
 FOR EACH ROW EXECUTE FUNCTION public.homly_enqueue_order_email();
REVOKE ALL ON FUNCTION public.homly_enqueue_order_email() FROM PUBLIC,anon,authenticated;
-- Existing server-only Vault-based cron authentication reused for private worker.
SELECT cron.schedule('homly-email-dispatch','*/5 * * * *',
 $job$
 SELECT net.http_post(
  url:='https://rdwcymfjktxbyoidyhax.supabase.co/functions/v1/homly-email-dispatch',
  headers:=jsonb_build_object('Content-Type','application/json',
   'X-Homly-Cron',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='homly_reconcile_cron')),
  body:='{}'::jsonb,timeout_milliseconds:=30000
 );
 $job$);
