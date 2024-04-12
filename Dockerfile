FROM node:20.12.2-alpine

WORKDIR /app

COPY dist dist
COPY prisma prisma
COPY package-lock.json .
COPY package.json .

RUN npm ci --omit=dev

CMD npx prisma migrate deploy ; npm run start:prod
