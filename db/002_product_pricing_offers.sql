ALTER TABLE product
  ADD COLUMN IF NOT EXISTS price numeric(10,2),
  ADD COLUMN IF NOT EXISTS offer_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS offer_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_label text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_price_nonnegative') THEN
    ALTER TABLE product ADD CONSTRAINT product_price_nonnegative
      CHECK (price IS NULL OR price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_offer_price_nonnegative') THEN
    ALTER TABLE product ADD CONSTRAINT product_offer_price_nonnegative
      CHECK (offer_price IS NULL OR offer_price >= 0);
  END IF;
END $$;
