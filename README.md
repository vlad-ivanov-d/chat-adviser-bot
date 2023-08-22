# Chat Adviser

Chat Adviser is an open source Telegram bot that helps to moderate chats.

<https://t.me/chat_adviser_bot>

## Bot Features

### Ban Voting

The bot can run votes to ban a user in a chat. The user will be banned and their message deleted if the appropriate number of votes is reached. The vote limit for making a decision is configurable.

### Language

The bot can chat in multiple languages. Right now it supports English and Russian.

### Restriction On Adding Bots

The bot can prevent users from adding bots to chat. Additionally, it's possible to configure the ban of the violator. The user who tried to add the bot will be banned.

## Getting Started

### Prerequisites

- Docker
- NPM (check actual version in `engines` section of [package.json](./package.json) file)
- Node.js (check actual version in `engines` section of [package.json](./package.json) file)

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

## License

This project is licensed under the terms of the [MIT license](./LICENSE).
