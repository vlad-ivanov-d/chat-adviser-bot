import type { EditedMessageCtx, MessageCtx } from "src/types/telegraf-context";

import { getUserFullName } from "./telegraf";

/**
 * Gets the text from message
 * @param message Message
 * @returns Text
 */
export const getMessageText = (
  message: EditedMessageCtx["update"]["edited_message"] | MessageCtx["update"]["message"],
): string => {
  if ("caption" in message) {
    return message.caption ?? "";
  }
  if ("left_chat_member" in message) {
    return getUserFullName(message.left_chat_member);
  }
  if ("new_chat_members" in message) {
    return message.new_chat_members.map(getUserFullName).join(", ");
  }
  if ("poll" in message) {
    return [message.poll.question, ...message.poll.options.map((o) => o.text)].join("\n");
  }
  if ("text" in message) {
    return message.text;
  }
  return "";
};
