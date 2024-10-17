FROM node:20.18.0

WORKDIR /app

COPY dist dist
COPY grafana grafana
COPY prisma prisma
COPY package-lock.json .
COPY package.json .

RUN mkdir -p /etc/grafana/provisioning && npm ci --omit=dev

CMD ["/bin/sh", "-c", \
  "rm -rf /etc/grafana/provisioning/*; \
  cp -ur grafana/provisioning/* /etc/grafana/provisioning; \
  npx prisma migrate deploy; \
  npm run start:prod"]
