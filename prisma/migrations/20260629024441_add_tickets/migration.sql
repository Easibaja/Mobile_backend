-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "place_name" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_label" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "qr_token" TEXT NOT NULL,
    "payment_intent_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qr_token_key" ON "tickets"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_payment_intent_id_key" ON "tickets"("payment_intent_id");

-- CreateIndex
CREATE INDEX "tickets_user_id_idx" ON "tickets"("user_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
