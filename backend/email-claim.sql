-- Atomic claim prevents duplicate sends by overlapping cron workers.
ALTER TABLE public.homly_email_outbox DROP CONSTRAINT IF EXISTS homly_email_outbox_state_check;
ALTER TABLE public.homly_email_outbox ADD CONSTRAINT homly_email_outbox_state_check
 CHECK(state IN ('pending','sending','sent','failed'));
ALTER TABLE public.homly_email_outbox
 ADD COLUMN IF NOT EXISTS lease_until timestamptz;
CREATE OR REPLACE FUNCTION public.homly_claim_email_batch()
 RETURNS SETOF public.homly_email_outbox
 LANGUAGE sql SECURITY DEFINER SET search_path=''
AS $$
 WITH claimable AS (
  SELECT id FROM public.homly_email_outbox
  WHERE attempts<12 AND
    ((state='pending' AND next_attempt_at<=now()) OR
     (state='sending' AND lease_until<now()))
  ORDER BY next_attempt_at,created_at
  FOR UPDATE SKIP LOCKED LIMIT 10
 )
 UPDATE public.homly_email_outbox o
 SET state='sending',attempts=o.attempts+1,
  last_attempt_at=now(),lease_until=now()+interval '3 minutes'
 FROM claimable WHERE o.id=claimable.id
 RETURNING o.*;
$$;
REVOKE ALL ON FUNCTION public.homly_claim_email_batch() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.homly_claim_email_batch() TO service_role;
