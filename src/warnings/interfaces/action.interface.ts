import type { Chat, User } from "telegraf/typings/core/types/typegram";

export interface WarnOptions {
  /**
   * Candidate user
   */
  candidate: User;
  /**
   * Candidate message id
   */
  candidateMessageId: number;
  /**
   * Candidate sender chat
   */
  candidateSenderChat?: Chat;
}

export enum WarningsAction {
  SAVE = "cfg-wrn-sv",
  SETTINGS = "cfg-wrn",
}
