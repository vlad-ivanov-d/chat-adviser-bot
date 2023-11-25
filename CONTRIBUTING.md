# Contributing

Notes for developers

## Prerequisites

- Docker
- NPM (check the actual version in the `engines` section of the [package.json](./package.json) file)
- Node.js (check the actual version in the `engines` section of the [package.json](./package.json) file)

## Extensions for IDE

The project is configured with recommended extensions for VSCode to suggest.

The required are:

- ESLint
- Prettier

## Restore Dependencies

```bash
npm ci
```

## Environment Variables

Copy `.env.sample` to `.env` and provide correct environment variables

## Build

```bash
npm run build
```

Resulted `./dist` folder can be moved to your hosting.

## Tests

The tests were implemented using Jest and the MSW library for mocking the Telegram API. Use an environment variable
`export DEBUG='telegraf:*'` to display in the console all running network requests to the Telegram API. Run tests before each commit, this will also update the test badges.

```bash
npm run test
```

## Development Server

```bash
npm run dev
```

The command starts the local `dev` server, compiles and reloads changes.

## Git Flow

- `dev` and `main` branches are protected
- Pull Requests are used to merging changes to the protected branches
- Pull Requests are used to code review
- After merged to protected branches, source branches are deleted
