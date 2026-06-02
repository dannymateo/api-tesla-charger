FROM node:20-alpine
WORKDIR /app
COPY gateway/package*.json ./
RUN npm install
COPY shared/observability ./shared/observability
COPY scripts/sync-observability.mjs ./scripts/sync-observability.mjs
COPY gateway/ .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
