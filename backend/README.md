# HOMLY Store — activation checklist

Implementation lives in this repo:
- Buyer signup, email verification, login and profile: account.html + account.js.
- Admin product editor with many image uploads, prices, inventory, published status: admin.html + admin.js.
- Database with protected orders, admin roles and immutable loyalty records: backend/schema.sql.
- Server-priced monobank invoice: supabase/functions/homly-create-checkout.
- Signed monobank callback and atomic points settlement: supabase/functions/homly-mono-webhook.
- Buyer/owner reconciliation for missed callbacks: supabase/functions/homly-sync-order.
- Automatic reconciliation of expired invoices: supabase/functions/homly-reconcile-pending.

IMPORTANT: Payment is NOT yet live. A dedicated HOMLY Supabase project exists, but
bank credentials and production products are still missing. Do not reuse the DISCOURSE database.

## 1. Separate Supabase project

Create/select a project named for HOMLY. Apply backend/schema.sql once in
that project's SQL Editor, then run security advisors. All tables use row-level
security (RLS). Confirm that Auth email verification is enabled.

Set Auth website URL to https://anastasia2627.github.io/homly/
Add https://anastasia2627.github.io/homly/account.html to redirect URLs.

Sign up and confirm the owner email on account.html. In the SQL Editor, give
that user admin rights with the following SQL (replace the example email):

    insert into public.homly_admins(user_id)
    select id from auth.users where email='YOUR_CONFIRMED_OWNER_EMAIL'
    on conflict(user_id) do nothing;

Never allow users to assign themselves admin via public forms.

## 2. Browser config (public, not secret)

Edit store-config.js, only setting supabaseUrl and publishableKey. Keep
paymentsEnabled false until test transactions have been verified.

    window.HOMLY_CONFIG={
      supabaseUrl:'https://PROJECT_REF.supabase.co',
      publishableKey:'sb_publishable_PUBLIC_KEY',
      paymentsEnabled:false
    };

A Supabase publishable key is designed to be visible in a browser. Do NOT
put a secret/service_role key or banking token in this file or GitHub.

After publishing, add a test product through admin.html. Confirm that:
  - owner can upload photos, set prices, publish and archive (unpublish);
  - unauthenticated visitors cannot write products or see draft products;
  - public catalog loads the newly published products from the database;
  - only customers can see their own profiles and orders.

## 3. monobank acquiring (do NOT enable live yet)

Create a merchant acquiring account. Start with its official test token.
Store MONOBANK_TOKEN in Supabase Edge Function Secrets ONLY.
The webhook URL is derived automatically from SUPABASE_URL.
Optional overrides (already have sensible HOMLY defaults):
  HOMLY_MONO_WEBHOOK_URL =
    https://rdwcymfjktxbyoidyhax.supabase.co/functions/v1/homly-mono-webhook,
  HOMLY_SITE_ORIGIN = https://anastasia2627.github.io,
  HOMLY_SITE_URL = https://anastasia2627.github.io/homly

Supabase provides SUPABASE_URL. The server role key must be present in
the server runtime only as SUPABASE_SERVICE_ROLE_KEY.

The four Edge Functions are already deployed to the HOMLY project:
homly-create-checkout, homly-mono-webhook, homly-sync-order and
homly-reconcile-pending.
The webhook uses verify_jwt=false and verifies the bank ECDSA signature and authoritative
invoice status in code. The two buyer functions require a verified user JWT.
Set the merchant secrets before testing any payment; never commit tokens.

The checkout computes totals from the database (not browser prices),
creates a pending order and bank invoice. The signed webhook calls the
bank's invoice-status endpoint before marking the order paid. Settlement
is idempotent, and loyalty points are credited only after verified payment.

## 4. Tests and production blockers

Do not turn on paymentsEnabled until each test passes: signup, email
verification, owner access, draft visibility, invoice payment, failed
payment, duplicate webhook, forged webhook, stale price, inventory
concurrency, account isolation, refund and corresponding points reversal.

Other launch requirements: merchant approval, published delivery/refund/
privacy/terms policies, receipts/fiscalization where applicable, stock
reservation/release, shipping integration and an operational refund process.

The owner must choose/approve bonus rules in the admin panel: earn %, UAH per point,
redemption cap, welcome and birthday bonuses. Both main loyalty and redemption are
disabled by default. A purchase reserves inventory and loyalty debits atomically;
failed payments restore them, confirmed payments grant awards, and verified full
refunds reverse points. Welcome and birthday rewards are claimed on signed-in account
loads, if enabled and eligible. Birthday gifts are once yearly and only on the birth
date, after a paid order, and at least 30 days after the date was entered. A daily Supabase pg_cron job `homly-daily-rewards` runs at 07:10 UTC,
checking verified welcome bonuses and eligible birthdays even if users do not log in.
See backend/loyalty-cron.sql.
Check backend/loyalty-upgrade.sql for the replayable full migration.

Current status (2026-11-17): connected to dedicated Supabase project
`rdwcymfjktxbyoidyhax` (HOME / homly). Initial SQL migration applied:
7 RLS-protected tables, product-photo bucket, and server-only settlement RPC.
The public publishable key is configured in `store-config.js`; payments remain
DISABLED. The first owner account must be registered and email-verified before
it can be added to `homly_admins`. Auth email redirect URL settings must be
verified in the Supabase Dashboard. Product catalog shows demo products until
an owner publishes real products. monobank credentials, merchant verification
and full payment testing are NOT complete; NO live payments are accepted.


## Current deployment review — 2026-11-17 (latest)

- Supabase: HOMLY project rdwcymfjktxbyoidyhax, protected order and wallet schema,
  loyalty upgrade and daily rewards cron applied, 4 Edge Functions active.
- Browser: wallet balance via homly_my_points RPC, eligible signup/birthday claims,
  bonus transaction history, redemption preview and checkout request wiring.
- Owner: admin account exists; loyalty settings include earning, spending value/cap,
  signup and birthday awards. Owner must approve actual monetary rules before enabling.
- VERIFIED security privileges: anonymous/authenticated browsers cannot invoke the
  order reservation service RPC; service_role can. No customer points can be written
  directly via browser RLS.
- NO live merchant setup: MONOBANK_TOKEN and required payment secrets not confirmed;
  store-config.js paymentsEnabled=false. Do not flip this until full bank test completion.
- NO published real products, orders, or loyalty transactions in HOMLY database as
  checked today. One existing owner user; customer signup can be used for testing.
- NOT YET launch-complete: test provider callbacks and signature rotation with a
  monobank sandbox token, stock contention, payment duplicate and reversal flows,
  pending-invoice expiry/reconciliation, external commerce policies/fiscalization,
  delivery information and real product photos/prices.
- Supabase security advisor still warns about compromised-password protection being
  disabled; enable it in Authentication settings before public launch. The intentional
  authenticated SECURITY DEFINER reward-claim RPC is guarded by auth.uid(), verified
  email, one-time unique indexes and a birthday cooling-off period. Review this
  privileged surface before production traffic.

For pending invoices whose bank callback was missed, buyers can trigger
homly-sync-order on returning to the account page. The owner can reconcile up to
15 recent pending/paid invoices from the order management tab. A fully automatic
bank-reconciliation schedule for abandoned invoices still needs configuration
before unattended high-volume sales.


## Automated payment safety — 2026-11-17

Payment checkout: valid Monobank payment links include `https://pay.mbnk.biz/...`.
The public client and the server both allow only explicit official hosts.
Merchant invoices expire after 1800 seconds (30 minutes). The bank does not
send an `expired` webhook; therefore Supabase pg_cron triggers
`homly-reconcile-pending` every 10 minutes via pg_net. Its 256-bit random
authorization key lives exclusively in Supabase Vault. The Edge Function
verifies the key via a service-role-only RPC before querying the bank.

- Paid: settle an order and award bonus points once.
- Failed, expired, cancelled: release reserved inventory and restore spent
  points after verifying the invoice's status directly at monobank.
- Pending or unknown: keep inventory reserved and mark an unresolved
  bank invoice for manual review. NEVER assume an unpaid invoice from
  a missing callback.
- Refunds: only a confirmed FULL reversal may automatically reverse all
  loyalty points; partial refunds need a manual proportional adjustment.
- The account payment-return screen never trusts the URL redirect itself as
  proof of payment and only clears purchased quantities from the same
  browser's cart after verified paid status.

**Still blocked:** A merchant or official test token must be saved privately
to Supabase Edge Function Secrets as `MONOBANK_TOKEN`. No token is stored
in GitHub. Payments remain off in store-config.js (`paymentsEnabled:false`).
Test acquiring must succeed end to end before setting it to true.
The HOMLY database currently contains no published sellable products.

Run the GitHub Actions checks after changes to browser modules and Edge
Functions. The owner can review bank exceptions in admin.html → Замовлення.
Supabase's leaked-password protection also needs enabling in Auth settings
before broad public launch.


## Order handling and shipment updates — 2026-11-17

- Owner Studio → **Замовлення** now shows paid orders, item lines and customer-provided
  delivery details, with a status selector: New / Packing / Shipped / Delivered.
- Owner manually registers the 14-digit Nova Poshta tracking number after creating
  the shipment in the Nova Poshta business cabinet. The tracking number is validated
  in the browser and by an owner-only DB RPC (`homly_update_fulfillment`).
  No buyer can invoke this operation on another person's order. The function cannot
  change bank status, item prices or loyalty balances.
- Buyer → **Мій акаунт** shows shipping progress and tracking number, linking to
  the carrier's official tracking site.
- An immutable shipment notification is queued when an order first becomes shipped.
  `homly-email-dispatch` v3 delivers a branded buyer email containing the TTN once
  `RESEND_API_KEY` and `HOMLY_EMAIL_FROM` are configured. Its queue retries failed sends.
- Backend migration: `backend/shipping-operations.sql`, applied to the HOMLY database.
  Product FK index: `backend/order-items-index.sql`, applied.
- Verified database permissions: `anon` cannot execute owner fulfillment RPC.
  A rolled-back SQL transaction verified packing → shipped, queued buyer shipping
  email and rejection of non-admin callers without persisting fake orders.
- This is **manual fulfillment**. Automatically creating a Nova Poshta consignment
  note is not enabled. That requires verified business account, sender details,
  credentials and carrier test shipping. Do not claim the TTN is generated by HOMLY.
- Payments remain OFF pending merchant token, domain/email configuration, real catalog
  products, and full provider-level payment test. A shipping workflow is not proof
  of live merchant payment readiness.
