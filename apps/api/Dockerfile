FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/casa-app/package.json apps/casa-app/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN npm ci

COPY apps/api apps/api
COPY deploy/postgres/init.sql deploy/postgres/init.sql
COPY packages/contracts packages/contracts
COPY packages/typescript-config packages/typescript-config
RUN npm run build --workspace @casa/contracts && npm run build --workspace @casa/api

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/casa-app/package.json apps/casa-app/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN npm ci --omit=dev --workspace @casa/api --workspace @casa/contracts \
  && npm cache clean --force

COPY --from=build --chown=node:node /app/apps/api/dist apps/api/dist
COPY --from=build --chown=node:node /app/packages/contracts/dist packages/contracts/dist
COPY --chown=node:node deploy/postgres/init.sql deploy/postgres/init.sql

USER node
EXPOSE 3000

CMD ["node", "apps/api/dist/server.js"]

