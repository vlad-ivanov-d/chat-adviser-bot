-- DropIndex
DROP INDEX "votebans_is_completed_idx";

-- AlterTable
ALTER TABLE "votebans" DROP COLUMN "is_completed",
ADD COLUMN     "candidate_message_id" DOUBLE PRECISION;
UPDATE "votebans" SET "candidate_message_id" = "message_id";
ALTER TABLE "votebans" ALTER COLUMN "candidate_message_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "votebans_candidate_media_group_id_idx" ON "votebans"("candidate_media_group_id");

-- CreateIndex
CREATE INDEX "votebans_candidate_message_id_idx" ON "votebans"("candidate_message_id");
