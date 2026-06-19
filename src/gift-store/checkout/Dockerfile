# syntax=docker/dockerfile:1
# Build context is the template root (see root docker-compose).
FROM node:26-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN npm install --global npm@latest
RUN npm install --global corepack@latest && corepack prepare pnpm@11.8.0 --activate
WORKDIR /repo

FROM base AS build
# Install with the full workspace manifest set for a cached, deterministic install.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY src/gift-store/commerce/package.json src/gift-store/commerce/package.json
COPY src/gift-store/checkout/package.json src/gift-store/checkout/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY src/gift-store/commerce src/gift-store/commerce
COPY src/gift-store/checkout src/gift-store/checkout
RUN pnpm --filter @gift-store/commerce build && pnpm --filter @gift-store/checkout build
# Produce a self-contained, prod-only deployment directory at /app.
RUN pnpm --filter @gift-store/checkout deploy --prod /app

FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json
USER app
EXPOSE 8081
CMD ["node", "dist/index.js"]
