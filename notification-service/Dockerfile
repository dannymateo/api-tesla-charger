FROM node:20-alpine
WORKDIR /app
COPY shared/observability ./shared/observability
COPY scripts/sync-observability.mjs ./scripts/sync-observability.mjs
COPY notification-service/package*.json ./
RUN npm install
COPY notification-service/ .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
