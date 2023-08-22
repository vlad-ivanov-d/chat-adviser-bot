FROM node:18.17.1

WORKDIR /app

COPY node node
COPY prisma prisma
COPY prisma/schema.prisma node/schema.prisma

CMD npx prisma migrate deploy ; node node/index.js
