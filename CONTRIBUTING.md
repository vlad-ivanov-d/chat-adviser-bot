# Contributing

Notes for developers

## Prerequisites

- Docker
- NPM (check actual version in `engines` section of [package.json](./package.json) file)
- Node.js (check actual version in `engines` section of [package.json](./package.json) file)

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

## Development Server

```bash
npm run dev
```

The command starts the local `dev` server, compiles and reloads changes.

## Git Flow

- `dev` and `main` branches are protected
- Pull Requests used for merging changes to the protected branches
- Pull Requests used for code review
- After merged to protected branches, source branches are deleted
