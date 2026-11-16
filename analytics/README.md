# HOMLY — Clarity and Meta Pixel

Manage both non-secret public tracking IDs in HOMLY Studio → Аналітика:
https://anastasia2627.github.io/homly/admin.html

Only authenticated members of the homly_admins table can edit the settings;
ordinary customers cannot.

## Microsoft Clarity

1. Create a site project at https://clarity.microsoft.com/
2. Copy your Project ID from Settings → Setup.
3. Enable Consent Mode and disable default cookie setting in Clarity.
4. Save the ID in HOMLY Studio → Аналітика.
5. Open your shop privately, consent to Analytics, and inspect Clarity sessions.

Microsoft documentation:
https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2

## Meta Pixel

1. Open https://business.facebook.com/events_manager2/list
2. Create a Pixel and copy its numeric ID, not an access token.
3. Save the ID in HOMLY Studio → Аналітика.
4. Open your site in an incognito window, consent to Marketing, then inspect
   PageView, ViewContent, AddToCart, AddToWishlist and InitiateCheckout
   in Events Manager / Meta Pixel Helper.

Meta event guide:
https://developers.facebook.com/docs/facebook-business-extension/fbe/guides/pixel-events

## Consent and security

Both trackers are off until IDs have been saved. Neither script loads without
the visitor's affirmative permission. The visitor can decline, accept or
choose Analytics vs. Marketing separately and change the settings later via
the footer. Account and admin pages do not load tracking scripts.

No PII, email, passwords, phone numbers, delivery addresses or birthday data
is sent through the site's tracking hooks. Full legal privacy/refunds/delivery
pages are still required before taking real orders.

A Purchase event is intentionally absent until a server-confirmed successful
payment exists. Later, Meta Conversions API should send server verified
Purchase events with deduplication; browser redirects must not count as
confirmed orders.

Next useful tools: GA4, Google Search Console, confirmation emails,
shipping statuses, and server-verified purchase conversion tracking.

Status: the pipeline is live and configurable, but the owner has not entered
a Clarity Project ID or Meta Pixel ID yet.
