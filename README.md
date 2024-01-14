# Chat Adviser

Chat Adviser is an open source Telegram bot that helps to moderate chats.

<https://t.me/chat_adviser_bot>

## Bot Features

### Ban Voting

The bot can run votes to ban a user in a chat. The user will be banned and their message deleted if the appropriate number of votes is reached. This feature will help users ban the violator when administrators are offline. Messages sent more than 48 hours ago won't be deleted according to Telegram rules.

/voteban - start voting (can be used without the slash)

### Language

The bot can communicate in different languages so that chat users can understand the bot.

### Messages On Behalf Of Channels

The bot can filter messages on behalf of channels (not to be confused with forwarded messages). Users who have their own Telegram channels can write in public chats on behalf of the channels. In this way, they can make additional advertising for themselves or simply anonymize messages without fear of ban. Even if the administrator bans a chat channel, the user can create a new channel and write on its behalf.

### Profanity Filter

The bot can filter profanity in chat, including usernames. The filter won't be applied to messages from administrators.

### Restriction On Adding Bots

The bot can prevent users from adding bots to chat. This will help avoid spam or, for example, collecting chat statistics without the approval of administrators. Additionally, the ban of the violator can be configured. The user who tried to add the bot will be banned.

### Time Zone

The bot can work in different time zones and display dates in the appropriate format.

## Getting Started

### Prerequisites

- Docker
- NPM (check the actual version in the `engines` section of the [package.json](./package.json) file)
- Node.js (check the actual version in the `engines` section of the [package.json](./package.json) file)

### Production

- Provide environment variables. Copy `.env.sample` to `.env` and set correct values.
- Restore dependencies: `npm ci`
- Build sources: `npm run build`
- Run production server: `npm run start`

### Development

- Provide environment variables. Copy `.env.sample` to `.env` and set correct values.
- Restore dependencies: `npm ci`
- Run development server: `npm run dev`

Get more details in [Contributing](./CONTRIBUTING.md)

## Test Coverage

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](https://img.shields.io/badge/statements-58.93%25-red.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-38.84%25-red.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-61.36%25-red.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-57.32%25-red.svg?style=flat) |

## License

This project is licensed under the terms of the [MIT license](./LICENSE).
