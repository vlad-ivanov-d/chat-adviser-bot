# Chat Adviser Bot

Open source Telegram bot that helps to moderate chats.

<https://t.me/chat_adviser_bot>

## Features

### Ban Voting

The bot can run votes to ban a user in a chat. The user will be banned and their message deleted if the appropriate number of votes is reached. This feature will help users ban the violator when administrators are offline. Messages sent more than 48 hours ago won't be deleted according to Telegram rules.

`/voteban` - start voting (can be used without the slash)

**Tip:** Don't set your vote limit too low. Otherwise, a user who has several accounts will be able to single-handedly collect the required number of votes and ban other chat members.

### Language

The bot can communicate in different languages so that chat users can understand the bot.

### Messages On Behalf Of Channels

The bot can filter messages on behalf of channels (not to be confused with forwarded messages) in group chats. Users who have their own Telegram channels can write in public chats on behalf of the channels. In this way, they can make advertising for themselves or simply anonymize messages without fear of ban. Even if the administrator bans a chat channel, the user can create a new channel and write on its behalf.

### Profanity Filter

The bot can filter profanity in chat, including usernames. The filter won't be applied to messages from administrators.

### Restriction On Adding Bots

The bot can prevent users from adding bots to chat. This will help avoid spam or, for example, collecting chat statistics without the approval of administrators. Additionally, the ban of the violator can be configured. The user who tried to add the bot will be banned.

### Summary

The bot can give a summary of the chat conversation.

`/summary` - summary with default settings (last 200 messages)  
`/summary 100` - summary of the last 100 messages  
`/summary 24h` - summary for the last 24 hours (but no more than 200 messages)  

Please note that it will not be able to provide a summary of the messages that were in the chat before the bot joined.

### Time Zone

The bot can work in different time zones and display dates in the appropriate format.

### Warnings

The bot can issue warnings to users by admin command. To do this, respond to the user's message with the appropriate command. In this case, the user's message will be deleted. Each warning is valid for 90 days, then it is automatically removed. If 3 warnings are received, the user will be banned.

`/warn` - issue a warning

## Getting Started

### Prerequisites

- Docker
- NPM (check the actual version in the `engines` section of the [package.json](./package.json) file)
- Node.js (check the actual version in the `engines` section of the [package.json](./package.json) file)

### Production

1. Provide environment variables. Copy [.env.sample](./.env.sample) to `.env` and set correct values.
2. Install dependencies

    ```text
    npm ci
    ```

3. Build sources

    ```text
    npm run build
    ```

4. Run production server

    ```text
    npm run start:prod
    ```

    To start the server in docker, use the following command:

    ```text
    npm run start:prod:docker
    ```

### Development

1. Provide environment variables. Copy [.env.sample](./.env.sample) to `.env` and set correct values.
2. Install dependencies

    ```text
    npm ci
    ```

3. Run development server

    ```text
    npm run start:dev
    ```

Get more details in [Contributing](./CONTRIBUTING.md)

## Test Coverage

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](https://img.shields.io/badge/statements-86.54%25-yellow.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-72.64%25-red.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-86.28%25-yellow.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-85.96%25-yellow.svg?style=flat) |

## License

This project is licensed under the terms of the [MIT license](./LICENSE).
