-- Safe on non-empty favorites: add columns first, backfill, then enforce NOT NULL.
ALTER TABLE "favorites" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "favorites" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6);
UPDATE "favorites" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "favorites" ALTER COLUMN "updated_at" SET NOT NULL;

-- Create settings table if not present.
CREATE TABLE IF NOT EXISTS "user_settings" (
    "user_id" TEXT NOT NULL,
    "units" TEXT NOT NULL DEFAULT 'km',
    "search_radius" INTEGER NOT NULL DEFAULT 15000,
    "theme_preference" TEXT NOT NULL DEFAULT 'auto',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- Add FK only when missing to avoid duplicate-constraint errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_user_id_fkey'
  ) THEN
    ALTER TABLE "user_settings"
      ADD CONSTRAINT "user_settings_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
