-- DropForeignKey
ALTER TABLE "VotebanBanVoter" DROP CONSTRAINT "VotebanBanVoter_votebanId_fkey";

-- DropForeignKey
ALTER TABLE "VotebanNoBanVoter" DROP CONSTRAINT "VotebanNoBanVoter_votebanId_fkey";

-- AddForeignKey
ALTER TABLE "VotebanBanVoter" ADD CONSTRAINT "VotebanBanVoter_votebanId_fkey" FOREIGN KEY ("votebanId") REFERENCES "Voteban"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotebanNoBanVoter" ADD CONSTRAINT "VotebanNoBanVoter_votebanId_fkey" FOREIGN KEY ("votebanId") REFERENCES "Voteban"("id") ON DELETE CASCADE ON UPDATE CASCADE;
