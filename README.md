# Chat Adviser

Chat Adviser is an open source Telegram bot that helps to moderate chats.

<https://t.me/chat_adviser_bot>

## Bot Features

### Ban Voting

The bot can run votes to ban a user in a chat. The user will be banned and their message deleted if the appropriate number of votes is reached. This feature will help users ban the violator when administrators are offline. Messages sent more than 48 hours ago won't be deleted according to Telegram rules.

/voteban - start voting (can be used without the slash)

### Language

The bot can communicate in different languages so that chat users can understand the bot.

### Profanity Filter

The bot can filter profanity in chat, including usernames. The filter won't be applied to messages from administrators. The bot needs administrator permissions for this feature.

### Restriction On Adding Bots

The bot can prevent users from adding bots to chat. This will help avoid spam or, for example, collecting chat statistics without the approval of administrators. Additionally, the ban of the violator can be configured. The user who tried to add the bot will be banned. The bot needs administrator permissions for this feature.

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
| ![Statements](https://img.shields.io/badge/statements-32.01%25-red.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-10.24%25-red.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-17.57%25-red.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-28.92%25-red.svg?style=flat) |

## License

This project is licensed under the terms of the [MIT license](./LICENSE).
