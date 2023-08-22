-- CreateTable
CREATE TABLE "Chat" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "id" DOUBLE PRECISION NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL,
    "votebanLimit" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "firstName" TEXT NOT NULL,
    "id" DOUBLE PRECISION NOT NULL,
    "lastName" TEXT,
    "updated" TIMESTAMP(3) NOT NULL,
    "username" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voteban" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "candidateId" DOUBLE PRECISION NOT NULL,
    "chatId" DOUBLE PRECISION NOT NULL,
    "completed" BOOLEAN,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "messageId" DOUBLE PRECISION NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voteban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotebanBanVoter" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL,
    "votebanId" BIGINT NOT NULL,

    CONSTRAINT "VotebanBanVoter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotebanNoBanVoter" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL,
    "votebanId" BIGINT NOT NULL,

    CONSTRAINT "VotebanNoBanVoter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChatAdmins" (
    "A" DOUBLE PRECISION NOT NULL,
    "B" DOUBLE PRECISION NOT NULL
);

-- CreateIndex
CREATE INDEX "Voteban_created_idx" ON "Voteban"("created");

-- CreateIndex
CREATE UNIQUE INDEX "Voteban_chatId_messageId_key" ON "Voteban"("chatId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "VotebanBanVoter_authorId_votebanId_key" ON "VotebanBanVoter"("authorId", "votebanId");

-- CreateIndex
CREATE UNIQUE INDEX "VotebanNoBanVoter_authorId_votebanId_key" ON "VotebanNoBanVoter"("authorId", "votebanId");

-- CreateIndex
CREATE UNIQUE INDEX "_ChatAdmins_AB_unique" ON "_ChatAdmins"("A", "B");

-- CreateIndex
CREATE INDEX "_ChatAdmins_B_index" ON "_ChatAdmins"("B");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voteban" ADD CONSTRAINT "Voteban_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voteban" ADD CONSTRAINT "Voteban_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voteban" ADD CONSTRAINT "Voteban_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voteban" ADD CONSTRAINT "Voteban_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotebanBanVoter" ADD CONSTRAINT "VotebanBanVoter_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotebanBanVoter" ADD CONSTRAINT "VotebanBanVoter_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotebanBanVoter" ADD CONSTRAINT "VotebanBanVoter_votebanId_fkey" FOREIGN KEY ("votebanId") REFERENCES "Voteban"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotebanNoBanVoter" ADD CONSTRAINT "VotebanNoBanVoter_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotebanNoBanVoter" ADD CONSTRAINT "VotebanNoBanVoter_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotebanNoBanVoter" ADD CONSTRAINT "VotebanNoBanVoter_votebanId_fkey" FOREIGN KEY ("votebanId") REFERENCES "Voteban"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatAdmins" ADD CONSTRAINT "_ChatAdmins_A_fkey" FOREIGN KEY ("A") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatAdmins" ADD CONSTRAINT "_ChatAdmins_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
