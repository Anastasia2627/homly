-- HOMLY live prelaunch update. Applied to the real HOMLY project on 2026-11-17.
-- Incomplete entries may be drafts; published products have server-side checks.
ALTER TABLE public.homly_products ALTER COLUMN price_kopeks DROP NOT NULL;
ALTER TABLE public.homly_products
 ADD COLUMN IF NOT EXISTS kit_contents text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS skill_level text NOT NULL DEFAULT 'beginner'
  CHECK(skill_level IN ('beginner','intermediate','advanced')),
 ADD COLUMN IF NOT EXISTS time_minutes integer CHECK(time_minutes BETWEEN 10 AND 1440),
 ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS homly_product_admin_status_idx
 ON public.homly_products(archived,published,created_at DESC);

CREATE OR REPLACE FUNCTION public.homly_product_publication_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE photo text;
BEGIN
 IF new.archived THEN
  IF new.published THEN RAISE EXCEPTION 'ARCHIVED_PRODUCT_CANNOT_BE_PUBLISHED'; END IF;
  IF new.featured THEN new.featured=false; END IF;
 END IF;
 IF new.price_kopeks IS NOT NULL AND new.price_kopeks<100
  THEN RAISE EXCEPTION 'PRODUCT_PRICE_INVALID'; END IF;
 IF array_length(new.image_urls,1)>12
  THEN RAISE EXCEPTION 'TOO_MANY_PRODUCT_PHOTOS'; END IF;
 IF new.published THEN
  IF new.price_kopeks IS NULL OR new.price_kopeks<100 OR
     length(btrim(new.description))<30 OR
     length(btrim(new.kit_contents))<10 OR
     coalesce(array_length(new.image_urls,1),0)<1
  THEN RAISE EXCEPTION 'PRODUCT_NOT_READY_FOR_PUBLICATION'; END IF;
  FOREACH photo IN ARRAY new.image_urls LOOP
   IF photo NOT LIKE 'https://rdwcymfjktxbyoidyhax.supabase.co/storage/v1/object/public/homly-products/products/%'
    THEN RAISE EXCEPTION 'PRODUCT_IMAGE_MUST_BE_OWN_STORAGE'; END IF;
  END LOOP;
  IF tg_op='INSERT' THEN
   IF new.stock<1 THEN RAISE EXCEPTION 'PUBLISH_REQUIRES_INITIAL_STOCK'; END IF;
  ELSIF old.published=false AND new.stock<1 THEN
   RAISE EXCEPTION 'PUBLISH_REQUIRES_INITIAL_STOCK';
  END IF;
 END IF;
 RETURN new;
END $$;
DROP TRIGGER IF EXISTS homly_product_publish_guard ON public.homly_products;
CREATE TRIGGER homly_product_publish_guard
 BEFORE INSERT OR UPDATE ON public.homly_products
 FOR EACH ROW EXECUTE FUNCTION public.homly_product_publication_guard();
