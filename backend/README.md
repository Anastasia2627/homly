# HOMLY Store — activation checklist

Implementation lives in this repo:
- Buyer signup, email verification, login and profile: account.html + account.js.
- Admin product editor with many image uploads, prices, inventory, published status: admin.html + admin.js.
- Database with protected orders, admin roles and immutable loyalty records: backend/schema.sql.
- Server-priced monobank invoice: supabase/functions/homly-create-checkout.
- Signed monobank callback and atomic points settlement: supabase/functions/homly-mono-webhook.

IMPORTANT: Payment is NOT yet live. The existing GitHub Pages storefront uses demo
products until HOMLY gets its own Supabase project. Do not reuse a database for DISCOURSE.

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
Store the following as Supabase Edge Function Secrets ONLY:
  MONOBANK_TOKEN (secret),
  HOMLY_MONO_WEBHOOK_URL =
    https://PROJECT_REF.supabase.co/functions/v1/homly-mono-webhook,
  HOMLY_SITE_ORIGIN = https://anastasia2627.github.io,
  HOMLY_SITE_URL = https://anastasia2627.github.io/homly

Supabase provides SUPABASE_URL. The server role key must be present in
the server runtime only as SUPABASE_SERVICE_ROLE_KEY.

Deploy the Edge Functions using the installed Supabase CLI after linking the
HOMLY project. The webhook needs verify_jwt=false because monobank signs its
requests with ECDSA. No other function should have JWT checks disabled.

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

The user must choose and approve bonus rules: earn %, redemption value,
redemption limits, refunds, expiry, welcome/email/birthday bonuses.
Default earning is 0% and disabled; redemption is NOT enabled. Admin can
set earning to 0–25%, but real billing cannot yet use points.

Current status: source scaffolding created in GitHub; no confirmed HOMLY
Supabase project selected; no SQL applied to a live project; no monobank
merchant credentials connected; NO payments can be collected yet.
