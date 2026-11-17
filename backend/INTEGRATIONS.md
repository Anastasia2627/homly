# HOMLY integration handover — 2026-11-17

HOMLY uses a custom GitHub Pages storefront with Supabase. Deployed code does not imply that an external service has been activated or tested. Never commit API secrets or enable public acquiring before signed bank tests.

## Implemented code

- Microsoft Clarity: consent-gated, project ID saved in Supabase, account/admin excluded.
- Google Analytics 4: owner Measurement ID field; opt-in-only page views and product/cart/checkout funnel events. Purchase conversion not yet connected.
- Meta Pixel: consent-gated browser pixel ID field, but Conversions API still pending confirmed payments and marketing consent.
- Sentry: owner Browser DSN field, consent-gated limited error reporting on public pages; no replay or user/request payloads.
- Nova Poshta: authenticated Edge Function for city and warehouse suggestions with manual address fallback. Real NP API key and sender references are still required for working suggestions and TTN creation.
- Resend: branded buyer paid/refunded and owner paid order emails; private durable email outbox, deduplicated jobs, 5-minute retry worker. Real verified sending domain, API key and sender are missing.
- Telegram: private outbox of paid/refunded alerts; 3-minute retry worker. Bot token/chat ID are missing. Low-stock alerts are still to be designed after products exist.
- Availability: hourly GitHub Actions basic site+Supabase checks. UptimeRobot independent account/alerts not yet connected.
- Search Console: sitemap.xml and canonical/social page metadata committed. External site verification and sitemap submission pending.
- Google Merchant Center: scheduled daily public-product feed generation, only from real published items with photos; no products are currently published and external Merchant account remains unconnected.
- Product SEO: Product/Offer structured data only on published live product pages, not static demo content.
- plata by mono remains disabled until actual merchant credentials and payment/refund tests.

## Owner actions required

1. Resend: verify an email-sending domain at https://resend.com/domains, create a send-only API key and add RESEND_API_KEY, HOMLY_EMAIL_FROM and optionally HOMLY_OWNER_EMAIL to Supabase Edge Function Secrets. Sign-up and password reset emails require separate Supabase Auth custom SMTP setup.
2. Nova Poshta: get an API key from https://novaposhta.ua/for-business/cooperation/integration/ and store NOVA_POSHTA_API_KEY in Supabase Secrets. Creating TTNs additionally needs real sender, address, warehouse, delivery dimensions, contact and account settings.
3. Telegram: create a bot using https://t.me/BotFather, send it a first message, find your chat ID, set HOMLY_TELEGRAM_BOT_TOKEN and HOMLY_TELEGRAM_CHAT_ID as Supabase secrets.
4. GA4 / Sentry / Meta Pixel: enter their public IDs/DSN in HOMLY Studio -> Analytics. The HOMLY analytics consent key is version 2 to request consent again when new providers are added.
5. Search Console: verify the URL-prefix property https://anastasia2627.github.io/homly/ and submit https://anastasia2627.github.io/homly/sitemap.xml . A robots.txt file under /homly/ would not replace the host-root /robots.txt, so we did not claim to configure root crawler rules.
6. Merchant Center: publish real products and photos, confirm shipping/returns policies and submit the feed https://anastasia2627.github.io/homly/merchant-feed.xml only after this file is generated. Google eligibility review and real feed delivery are unverified.
7. UptimeRobot: configure an independent website monitor and alert destination at https://uptimerobot.com/ if external outage notifications are required. GitHub workflow checks are not guaranteed external alerts.
8. Monobank: configure MONOBANK_TOKEN privately, then verify invoice links, success webhook, failed/expired invoice, duplicate callback, refund and wallet adjustments before enabling payments in store-config.js.

## Verified versus not yet tested

- Database migrations applied; cron jobs and deployed Edge Functions checked.
- Email/Telegram outbox tables have RLS and server-only claim permissions.
- A cron-authenticated request reached notification workers without keys and returned a configuration-required response. No message was sent.
- Consent-loader simulated with disabled analytics, accepted analytics, and protected account page. Only accepted public analytics loaded external scripts.
- Browser JavaScript syntax checked; GitHub Actions and feed generation runtime success are not yet confirmed.
- Real supplier API, mail sending, Telegram message delivery, external accounts, merchant approval and live bank tests require customer-owned credentials.

## Launch caveats

There are currently no published products or real paid orders. Supabase's leaked-password protection remains disabled and should be enabled before public scale. The security advisor flags the intended privileged reward-claim function for a careful production review. Do not treat these integrations as end-to-end production-tested until their provider-specific test cases pass.
