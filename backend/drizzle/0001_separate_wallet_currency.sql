DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_code') THEN
    CREATE TYPE "currency_code" AS ENUM ('USD', 'KHR');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "currency" "currency_code" DEFAULT 'USD' NOT NULL;
--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "opening_balance" numeric(14, 2) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "current_balance" numeric(14, 2) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'current_usd') THEN
    UPDATE "wallets"
    SET 
      "currency" = 'USD',
      "opening_balance" = COALESCE("opening_usd", 0.00),
      "current_balance" = COALESCE("current_usd", 0.00),
      "name_km" = CASE WHEN "name_km" NOT LIKE '%USD%' AND "name_km" NOT LIKE '%KHR%' THEN "name_km" || ' (USD)' ELSE "name_km" END,
      "name_en" = CASE WHEN "name_en" NOT LIKE '%USD%' AND "name_en" NOT LIKE '%KHR%' THEN "name_en" || ' (USD)' ELSE "name_en" END;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'current_khr') THEN
    INSERT INTO "wallets" ("code", "name_km", "name_en", "type", "category", "currency", "opening_balance", "current_balance", "is_active")
    SELECT 
      w."code" || '_khr',
      REPLACE(w."name_km", ' (USD)', '') || ' (KHR)',
      REPLACE(w."name_en", ' (USD)', '') || ' (KHR)',
      w."type",
      w."category",
      'KHR'::"currency_code",
      w."opening_khr",
      w."current_khr",
      true
    FROM "wallets" w
    WHERE (w."opening_khr" > 0 OR w."current_khr" > 0)
    ON CONFLICT ("code") DO NOTHING;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN IF EXISTS "opening_usd";
--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN IF EXISTS "opening_khr";
--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN IF EXISTS "current_usd";
--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN IF EXISTS "current_khr";
