FROM node:20.10.0-alpine

WORKDIR /app

COPY dist dist
COPY prisma prisma

CMD npx prisma migrate deploy ; node dist/index.js
