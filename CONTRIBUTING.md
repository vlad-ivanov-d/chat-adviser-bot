# Contributing

The project is built on the NestJS framework, so all approaches to the code base structure correspond to a NestJS application. For more details visit the NestJS website.

## Prerequisites

- Docker
- NPM (check the actual version in the `engines` section of the [package.json](./package.json) file)
- Node.js (check the actual version in the `engines` section of the [package.json](./package.json) file)

## Extensions for IDE

The project is configured with recommended extensions for VSCode to suggest.

The required are:

- ESLint
- Prettier

## Install Dependencies

```text
npm ci
```

## Environment Variables

Copy [.env.sample](./.env.sample) to `.env` and provide correct environment variables

## Build

```text
npm run build
```

Result will be in `./dist` folder.

## Tests

The tests were implemented using Jest and the MSW library for mocking the Telegram API. Use an environment variable
`export DEBUG='telegraf:*'` to display in the console all running network requests to the Telegram API.

### Unit And Integration Tests

Execute the following command to run unit and integration tests.

```text
npm run test
```

### End-to-End Tests

Execute the following command to run end-to-end tests.

```text
npm run test:e2e
```

### Load Tests

Execute the following command to run all load tests sequentially.

```text
npm run k6
```

Pass a test file name to run only a specific test. The name must correspond to the file located in the [k6](./k6) folder.

```text
npm run k6 -- help.spec.ts
```

### Total Test Coverage

Execute the following command to run unit, integration, end-to-end and load tests with a code coverage check. Run it before each commit, this will also update the test badges in [README](./README.md#test-coverage). It will also start dev server after all tests.

```text
npm run test:all
```

## Development Server

```text
npm run start:dev
```

The command starts the local development server, compiles and reloads changes.

## Git Flow

`dev` branch is used as a starting point for development. All new changes (feature branches, bug fixes, etc.) should be merged into this branch via Pull Request. Then `dev` is merged into `main` after stabilization. Changes will be automatically deployed to production after merging to the `main` branch.

- `dev` and `main` branches are protected
- Pull Requests are used to merging changes to the protected branches
- Pull Requests are used to code review
- After merged to protected branches, source branches are deleted
