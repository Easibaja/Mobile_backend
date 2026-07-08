-- Create device registrations for multi-device push support.
CREATE TABLE "device_registrations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "invalidated_at" TIMESTAMPTZ(6),
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "device_registrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "device_registrations_user_id_token_key" ON "device_registrations"("user_id", "token");
CREATE INDEX "device_registrations_user_id_is_active_idx" ON "device_registrations"("user_id", "is_active");

-- Store granular notification preferences and quiet hours.
CREATE TABLE "user_notification_preferences" (
  "user_id" TEXT NOT NULL,
  "infrastructure_enabled" BOOLEAN NOT NULL DEFAULT true,
  "location_enabled" BOOLEAN NOT NULL DEFAULT true,
  "weather_enabled" BOOLEAN NOT NULL DEFAULT true,
  "quiet_hours_start" TEXT,
  "quiet_hours_end" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Keep immutable delivery history for observability and troubleshooting.
CREATE TABLE "notification_deliveries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "device_id" TEXT,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "provider_message_id" TEXT,
  "failure_reason" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_deliveries_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "notification_deliveries_user_id_created_at_idx" ON "notification_deliveries"("user_id", "created_at");

-- Queue table for reliable retries and worker processing.
CREATE TABLE "notification_jobs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_error" TEXT,
  "processed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notification_jobs_status_next_attempt_at_idx" ON "notification_jobs"("status", "next_attempt_at");
CREATE INDEX "notification_jobs_user_id_created_at_idx" ON "notification_jobs"("user_id", "created_at");
