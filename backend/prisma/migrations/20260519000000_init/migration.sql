-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "guest_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "entry_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exit_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "ride_name" TEXT NOT NULL,
    "s3_key" TEXT,
    "s3_url" TEXT,
    "watermark_url" TEXT,
    "file_size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "photos_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "order_type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_mode" TEXT,
    "payment_splits" TEXT,
    "delivery_status" TEXT NOT NULL DEFAULT 'pending',
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "print_queued" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "print_queue" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "guest_name" TEXT,
    "phone" TEXT,
    "print_size" TEXT NOT NULL DEFAULT 'A4',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed_at" TIMESTAMP(3),
    "collected_at" TIMESTAMP(3),
    CONSTRAINT "print_queue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "print_queue_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "print_queue_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "rides" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wristbands" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "batch_date" TEXT NOT NULL,
    "batch_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    CONSTRAINT "wristbands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "short_links" (
    "code" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "short_links_pkey" PRIMARY KEY ("code"),
    CONSTRAINT "short_links_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token"),
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "photos_visit_id_captured_at_idx" ON "photos"("visit_id", "captured_at");
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX "orders_visit_id_idx" ON "orders"("visit_id");
CREATE INDEX "print_queue_queued_at_status_idx" ON "print_queue"("queued_at", "status");
CREATE INDEX "wristbands_batch_date_idx" ON "wristbands"("batch_date");
CREATE INDEX "wristbands_status_batch_date_idx" ON "wristbands"("status", "batch_date");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
