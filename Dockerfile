FROM node:20.15.0-alpine

WORKDIR /app

COPY dist dist
COPY grafana grafana
COPY prisma prisma
COPY package-lock.json .
COPY package.json .

RUN mkdir -p /etc/grafana/provisioning
RUN npm ci --omit=dev

CMD rm -rf /etc/grafana/provisioning/*; \
  cp -ur grafana/provisioning/* /etc/grafana/provisioning; \
  npx prisma migrate deploy; \
  npm run start:prod;
