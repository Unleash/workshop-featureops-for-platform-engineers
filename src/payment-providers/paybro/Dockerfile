# syntax=docker/dockerfile:1
# Build context is the template root (see root docker-compose).
FROM node:26-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN npm install --global npm@latest
RUN npm install --global corepack@latest && corepack prepare pnpm@11.7.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY src/payment-providers/paybro/package.json src/payment-providers/paybro/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY src/payment-providers/paybro src/payment-providers/paybro
RUN pnpm --filter @gift-store/paybro build
RUN pnpm --filter @gift-store/paybro deploy --prod /app

FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/assets ./assets
COPY --from=build --chown=app:app /app/package.json ./package.json
USER app
EXPOSE 8400
CMD ["node", "dist/index.js"]
