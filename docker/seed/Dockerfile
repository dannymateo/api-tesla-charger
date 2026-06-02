FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY auth-service/package*.json ./auth-service/
COPY stations-service/package*.json ./stations-service/
COPY sessions-service/package*.json ./sessions-service/
COPY billing-service/package*.json ./billing-service/

RUN cd auth-service && npm install \
  && cd ../stations-service && npm install \
  && cd ../sessions-service && npm install \
  && cd ../billing-service && npm install

COPY auth-service/prisma ./auth-service/prisma
COPY stations-service/prisma ./stations-service/prisma
COPY sessions-service/prisma ./sessions-service/prisma
COPY billing-service/prisma ./billing-service/prisma

COPY docker/seed ./docker/seed

CMD ["sh", "docker/seed/run-all-docker.sh"]
