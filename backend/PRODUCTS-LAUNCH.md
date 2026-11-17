# HOMLY — quick product launch, without fake inventory

The store initially has no real merchandise. The admin can prepare drafts months before sales. Nothing in this guide requires putting fake products or made-up prices into the live database.

## Workflow in HOMLY Studio

Open https://anastasia2627.github.io/homly/admin.html and sign in with the verified owner account.

1. Choose **Товари → Швидкий шаблон** for beads/textile/candles/decor, or click **+ Нова чернетка**. Templates set informative placeholders, not product details invented by software.
2. Fill in real title and category first; price, stock, images, descriptions, kit contents, skill level and estimated time can be added later. **Save as draft** whenever interrupted.
3. Upload up to 12 product photos (JPEG, PNG, WebP or AVIF, each <=5 MB). Use arrows in the preview to put the cover photo first. Uploaded images use the owner-protected Supabase Storage bucket.
4. Use **Попередній перегляд** to inspect the card privately without publishing it or showing it in the customer-facing catalog.
5. Check the **готовність до публікації** hint. The server requires a positive real price, at least 30 characters of product description, at least 10 characters of kit contents, at least one image from HOMLY Storage, and a non-zero opening stock. New products default to draft and need explicit confirmation to publish.
6. Publish only when the product exists and all claims/images/prices/stock are verified. For updates after selling out, existing published products may reach zero stock safely and will display as out of stock.
7. Use **Дублювати** to create variants as new drafts; verify contents, color, images and prices independently. Use **В архів** rather than deleting products referenced by orders.
8. Search by name or slug, or filter by drafts, published items and archive.

## Bulk CSV — for adding many future variants

The owner portal offers a downloadable CSV header-only template, a CSV importer and CSV export. Recommended UTF-8 columns:

title,slug,category,description,kit_contents,skill_level,time_minutes,price_uah,stock

- Required to create a draft: title and category. Other fields may be left empty; archived and published statuses, images and existing IDs are deliberately NOT imported.
- Allowed categories: beads, textile, candles, decor.
- Allowed difficulty: beginner, intermediate, advanced.
- Slug is optional and auto-generated if blank, but repeated slugs are rejected before bulk insert. All imported items are drafts even if an original CSV was exported from published products. Export is primarily for backup/reference.
- Bulk import maximum: 100 drafts per file, UTF-8, <=1 MB; uploaded in batches of 20. The browser asks for confirmation before import. Imported rows contain no images until you upload actual product photography.
- If a batch fails after earlier batches succeeded, review the imported draft list before retrying. This avoids silently editing previous items.

## Important launch conditions

- Customer-facing demo cards are labeled as examples while no real products are published; checkout remains disabled.
- Server-side product guards enforce real descriptions, composition, first photo and verified price before publishing; RLS allows only the owner to create/edit drafts.
- Real customer payments require separate monobank production setup, signed test callbacks, and end-to-end loyalty tests. Publishing catalog items alone **does not** enable checkout.
- Shipping, transactional email, Telegram and Google product feed integrations are prepared separately but still require user-owned credentials/verification.
- A product gallery, kit composition, beginner/intermediate/advanced level and time estimate are mapped to the live public product view. No kit information is fabricated.
- Tests live in tests/product-workflow.mjs and run in GitHub Actions with the static checks. Server publication guards were tested within a rolled-back SQL transaction.
