FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY shared/observability ./shared/observability
COPY scripts/sync-observability.mjs ./scripts/sync-observability.mjs
COPY billing-service/package*.json ./
RUN npm install
COPY billing-service/ .
COPY docker/seed /app/docker/seed
COPY docker/scripts/prisma-migrate-deploy.sh /app/prisma-migrate-deploy.sh
COPY docker/scripts/start-service.sh /app/start-service.sh
RUN chmod +x /app/prisma-migrate-deploy.sh /app/start-service.sh \
  && npx prisma generate && npm run build
EXPOSE 3000
CMD ["/app/start-service.sh", "billing-db"]
