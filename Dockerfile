FROM node:20.11.0-alpine

WORKDIR /app

COPY dist dist
COPY prisma prisma

CMD npx prisma migrate deploy ; node dist/index.js
