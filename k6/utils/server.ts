import { delay, http, HttpResponse, type HttpResponseResolver, passthrough, type PathParams } from "msw";
import { setupServer } from "msw/node";

import { group, privateChat, supergroup } from "fixtures/chats";
import { adminUser, bot, user } from "fixtures/users";
import { TEST_TG_API_BASE_URL } from "test/utils/constants";

/**
 * Resolves response for /banChatSenderChat and /deleteMessage endpoint
 * @returns HTTP response
 */
const actionResolver: HttpResponseResolver = async () => {
  await delay();
  return HttpResponse.json({ ok: true });
};

/**
 * Resolves response for /getChatAdministrators endpoint
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatAdministratorsResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  await delay();
  const { chat_id: chatId } = await info.request.json();
  return HttpResponse.json({
    ok: true,
    result:
      chatId === privateChat.id
        ? []
        : [
            { is_anonymous: false, status: "creator", user: adminUser },
            { is_anonymous: false, status: "administrator", user: bot },
          ],
  });
};

/**
 * Resolves response for /getChatMember endpoint
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatMemberResolver: HttpResponseResolver<PathParams, { user_id: number }> = async (info) => {
  await delay();
  const { user_id: userId } = await info.request.json();
  if (userId === adminUser.id) {
    return HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "creator", user: adminUser } });
  }
  return HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "member", user } });
};

/**
 * Resolves response for /getChatMembersCount endpoint
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatMembersCountResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  await delay();
  const { chat_id: chatId } = await info.request.json();
  return HttpResponse.json({ ok: true, result: chatId === privateChat.id ? 2 : 3 });
};

/**
 * Resolves response for /getChat endpoint
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  await delay();
  const { chat_id: chatId } = await info.request.json();
  switch (chatId) {
    case group.id:
      return HttpResponse.json({ ok: true, result: group });
    case supergroup.id:
    default:
      return HttpResponse.json({ ok: true, result: supergroup });
  }
};

/**
 * Resolves response for /getMe endpoint
 * @returns HTTP response
 */
const getMeResolver: HttpResponseResolver = async () => {
  await delay();
  return HttpResponse.json({ ok: true, result: bot });
};

/**
 * Resolves response for /sendMessage endpoint
 * @returns HTTP response
 */
const sendMessageResolver: HttpResponseResolver = async () => {
  await delay();
  return HttpResponse.json({ ok: true, result: { message_id: 5 } });
};

/**
 * Resolves response for /setMyCommands endpoint
 * @returns HTTP response
 */
const setMyCommands: HttpResponseResolver = async () => {
  await delay();
  return HttpResponse.json({ ok: true });
};

/**
 * Resolves response for /setWebhook endpoint
 * @returns HTTP response
 */
const setWebhookResolver: HttpResponseResolver = async () => {
  await delay();
  return HttpResponse.json({ ok: true, result: bot });
};

/**
 * MSW server
 */
export const server = setupServer(
  ...(process.env.TG_WEBHOOK_PATH ? [http.post(`**${process.env.TG_WEBHOOK_PATH}`, passthrough)] : []),
  http.post(`${TEST_TG_API_BASE_URL}/banChatSenderChat`, actionResolver),
  http.post(`${TEST_TG_API_BASE_URL}/deleteMessage`, actionResolver),
  http.post(`${TEST_TG_API_BASE_URL}/deleteMessages`, actionResolver),
  http.post(`${TEST_TG_API_BASE_URL}/getChat`, getChatResolver),
  http.post(`${TEST_TG_API_BASE_URL}/getChatAdministrators`, getChatAdministratorsResolver),
  http.post(`${TEST_TG_API_BASE_URL}/getChatMember`, getChatMemberResolver),
  http.post(`${TEST_TG_API_BASE_URL}/getChatMembersCount`, getChatMembersCountResolver),
  http.post(`${TEST_TG_API_BASE_URL}/getMe`, getMeResolver),
  http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, sendMessageResolver),
  http.post(`${TEST_TG_API_BASE_URL}/setMyCommands`, setMyCommands),
  http.post(`${TEST_TG_API_BASE_URL}/setWebhook`, setWebhookResolver),
);
