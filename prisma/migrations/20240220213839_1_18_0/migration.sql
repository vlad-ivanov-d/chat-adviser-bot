-- CreateIndex
CREATE UNIQUE INDEX "warnings_chat_id_message_id_key" ON "warnings"("chat_id", "message_id");
