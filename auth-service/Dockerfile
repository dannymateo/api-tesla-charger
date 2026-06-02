FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY shared/observability ./shared/observability
COPY scripts/sync-observability.mjs ./scripts/sync-observability.mjs
COPY auth-service/package*.json ./
RUN npm install
COPY auth-service/ .
COPY docker/scripts/prisma-migrate-deploy.sh /app/prisma-migrate-deploy.sh
RUN chmod +x /app/prisma-migrate-deploy.sh && npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "until /app/prisma-migrate-deploy.sh; do echo 'waiting for auth-db'; sleep 2; done; node dist/src/main.js"]
