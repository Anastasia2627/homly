-- Durable Telegram owner alerts, independent of payment and email delivery.
CREATE TABLE IF NOT EXISTS public.homly_telegram_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.homly_orders(id) ON DELETE RESTRICT,
 event text NOT NULL CHECK(event IN ('order_paid','order_refunded')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 12),
 created_at timestamptz NOT NULL DEFAULT now(),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 last_error text,
 sent_at timestamptz,
 provider_message_id text,
 UNIQUE(order_id,event)
);
ALTER TABLE public.homly_telegram_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.homly_telegram_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.homly_telegram_outbox TO service_role;
CREATE INDEX IF NOT EXISTS homly_telegram_ready_idx
 ON public.homly_telegram_outbox(next_attempt_at,created_at)
 WHERE state='pending' AND attempts<12;
CREATE OR REPLACE FUNCTION public.homly_enqueue_telegram_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF new.status='paid' AND old.status IS DISTINCT FROM new.status THEN
  INSERT INTO public.homly_telegram_outbox(order_id,event)
   VALUES(new.id,'order_paid') ON CONFLICT(order_id,event) DO NOTHING;
 ELSIF new.status='refunded' AND old.status IS DISTINCT FROM new.status THEN
  INSERT INTO public.homly_telegram_outbox(order_id,event)
   VALUES(new.id,'order_refunded') ON CONFLICT(order_id,event) DO NOTHING;
 END IF;
 RETURN new;
END $$;
DROP TRIGGER IF EXISTS homly_order_telegram_outbox ON public.homly_orders;
CREATE TRIGGER homly_order_telegram_outbox
 AFTER UPDATE OF status ON public.homly_orders FOR EACH ROW
 EXECUTE FUNCTION public.homly_enqueue_telegram_alert();
REVOKE ALL ON FUNCTION public.homly_enqueue_telegram_alert() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.homly_claim_telegram_batch()
 RETURNS SETOF public.homly_telegram_outbox
 LANGUAGE sql SECURITY DEFINER SET search_path=''
AS $$
 WITH claimable AS (
  SELECT id FROM public.homly_telegram_outbox
  WHERE attempts<12 AND
   ((state='pending' AND next_attempt_at<=now()) OR
    (state='sending' AND lease_until<now()))
  ORDER BY next_attempt_at,created_at
  FOR UPDATE SKIP LOCKED LIMIT 10
 )
 UPDATE public.homly_telegram_outbox o
 SET state='sending',attempts=o.attempts+1,
  lease_until=now()+interval '3 minutes'
 FROM claimable WHERE o.id=claimable.id
 RETURNING o.*;
$$;
REVOKE ALL ON FUNCTION public.homly_claim_telegram_batch() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.homly_claim_telegram_batch() TO service_role;
SELECT cron.schedule('homly-telegram-alerts','*/3 * * * *',
 $job$
 SELECT net.http_post(
  url:='https://rdwcymfjktxbyoidyhax.supabase.co/functions/v1/homly-telegram-alerts',
  headers:=jsonb_build_object('Content-Type','application/json',
    'X-Homly-Cron',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='homly_reconcile_cron')),
  body:='{}'::jsonb,timeout_milliseconds:=30000
 );
 $job$);
