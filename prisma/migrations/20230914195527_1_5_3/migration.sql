-- CreateIndex
CREATE INDEX "Chat_displayTitle_idx" ON "Chat"("displayTitle");

-- SetCollation
ALTER TABLE "Chat" ALTER COLUMN "displayTitle" type TEXT COLLATE "C";
