/*
  Warnings:

  - Added the required column `updated_at` to the `favorites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "favorites" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" TEXT NOT NULL,
    "units" TEXT NOT NULL DEFAULT 'km',
    "search_radius" INTEGER NOT NULL DEFAULT 15000,
    "theme_preference" TEXT NOT NULL DEFAULT 'auto',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
