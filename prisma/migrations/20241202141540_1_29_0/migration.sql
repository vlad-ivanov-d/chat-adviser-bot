-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('max', 'pro');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('hours', 'messages');

-- CreateEnum
CREATE TYPE "SummaryRequestType" AS ENUM ('admin', 'user');

-- AlterEnum
ALTER TYPE "ChatSettingName" ADD VALUE 'summary';

-- AlterTable
ALTER TABLE "chat_settings" ADD COLUMN     "summary" INTEGER,
ADD COLUMN     "summary_type" "SummaryType" NOT NULL DEFAULT 'hours';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "message_thread_id" DOUBLE PRECISION,
ADD COLUMN     "text" TEXT;

-- CreateTable
CREATE TABLE "chat_plans" (
    "id" DOUBLE PRECISION NOT NULL,
    "author_id" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editor_id" DOUBLE PRECISION NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "type" "PlanType" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summary_requests" (
    "id" TEXT NOT NULL,
    "author_id" DOUBLE PRECISION NOT NULL,
    "chat_id" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editor_id" DOUBLE PRECISION NOT NULL,
    "type" "SummaryRequestType" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summary_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "summary_requests_created_at_idx" ON "summary_requests"("created_at");

-- AddForeignKey
ALTER TABLE "chat_plans" ADD CONSTRAINT "chat_plans_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_plans" ADD CONSTRAINT "chat_plans_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_requests" ADD CONSTRAINT "summary_requests_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_requests" ADD CONSTRAINT "summary_requests_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
