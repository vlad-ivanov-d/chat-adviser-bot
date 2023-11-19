-- DropForeignKey
ALTER TABLE "profane_words" DROP CONSTRAINT "profane_words_authorId_fkey";

-- DropForeignKey
ALTER TABLE "profane_words" DROP CONSTRAINT "profane_words_editorId_fkey";

-- DropForeignKey
ALTER TABLE "voteban_ban_voters" DROP CONSTRAINT "voteban_ban_voters_authorId_fkey";

-- DropForeignKey
ALTER TABLE "voteban_ban_voters" DROP CONSTRAINT "voteban_ban_voters_editorId_fkey";

-- DropForeignKey
ALTER TABLE "voteban_ban_voters" DROP CONSTRAINT "voteban_ban_voters_votebanId_fkey";

-- DropForeignKey
ALTER TABLE "voteban_no_ban_voters" DROP CONSTRAINT "voteban_no_ban_voters_authorId_fkey";

-- DropForeignKey
ALTER TABLE "voteban_no_ban_voters" DROP CONSTRAINT "voteban_no_ban_voters_editorId_fkey";

-- DropForeignKey
ALTER TABLE "voteban_no_ban_voters" DROP CONSTRAINT "voteban_no_ban_voters_votebanId_fkey";

-- DropIndex
DROP INDEX "voteban_ban_voters_authorId_votebanId_key";

-- DropIndex
DROP INDEX "voteban_no_ban_voters_authorId_votebanId_key";

-- AlterTable
ALTER TABLE "profane_words" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "profane_words" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "profane_words" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "profane_words" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable
ALTER TABLE "voteban_ban_voters" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "voteban_ban_voters" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "voteban_ban_voters" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "voteban_ban_voters" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "voteban_ban_voters" RENAME COLUMN "votebanId" TO "voteban_id";

-- AlterTable
ALTER TABLE "voteban_no_ban_voters" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "voteban_no_ban_voters" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "voteban_no_ban_voters" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "voteban_no_ban_voters" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "voteban_no_ban_voters" RENAME COLUMN "votebanId" TO "voteban_id";

-- CreateIndex
CREATE UNIQUE INDEX "voteban_ban_voters_author_id_voteban_id_key" ON "voteban_ban_voters"("author_id", "voteban_id");

-- CreateIndex
CREATE UNIQUE INDEX "voteban_no_ban_voters_author_id_voteban_id_key" ON "voteban_no_ban_voters"("author_id", "voteban_id");

-- AddForeignKey
ALTER TABLE "profane_words" ADD CONSTRAINT "profane_words_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profane_words" ADD CONSTRAINT "profane_words_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteban_ban_voters" ADD CONSTRAINT "voteban_ban_voters_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteban_ban_voters" ADD CONSTRAINT "voteban_ban_voters_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteban_ban_voters" ADD CONSTRAINT "voteban_ban_voters_voteban_id_fkey" FOREIGN KEY ("voteban_id") REFERENCES "votebans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteban_no_ban_voters" ADD CONSTRAINT "voteban_no_ban_voters_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteban_no_ban_voters" ADD CONSTRAINT "voteban_no_ban_voters_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteban_no_ban_voters" ADD CONSTRAINT "voteban_no_ban_voters_voteban_id_fkey" FOREIGN KEY ("voteban_id") REFERENCES "votebans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
