FROM node:22-bookworm AS deps

# Install required packages
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy only the files needed for installing dependencies
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml tsconfig.json lage.config.js ./
COPY packages/api/package.json packages/api/package.json
COPY packages/component-library/package.json packages/component-library/package.json
COPY packages/crdt/package.json packages/crdt/package.json
COPY packages/desktop-client/package.json packages/desktop-client/package.json
COPY packages/desktop-electron/package.json packages/desktop-electron/package.json
COPY packages/eslint-plugin-actual/package.json packages/eslint-plugin-actual/package.json
COPY packages/loot-core/package.json packages/loot-core/package.json
COPY packages/sync-server/package.json packages/sync-server/package.json
COPY packages/plugins-service/package.json packages/plugins-service/package.json
COPY packages/ci-actions/package.json packages/ci-actions/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/docs/package.json packages/docs/package.json
COPY packages/import-normalizer/package.json packages/import-normalizer/package.json
COPY packages/vite-plugin-peggy/package.json packages/vite-plugin-peggy/package.json

COPY ./bin/package-browser ./bin/package-browser

RUN yarn install

FROM deps AS builder
COPY . .
RUN yarn build

FROM node:22-alpine AS prod
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/api /app/packages/api
COPY --from=builder /app/packages/import-normalizer /app/packages/import-normalizer
WORKDIR /app/packages/import-normalizer
CMD ["node", "sync.js"]
