# syntax=docker/dockerfile:1
# Build context is the template root (see root docker-compose).
FROM node:26-alpine AS build
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN npm install --global npm@latest
RUN npm install --global corepack@latest && corepack prepare pnpm@11.8.0 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY src/gift-store/commerce/package.json src/gift-store/commerce/package.json
COPY src/gift-store/storefront/package.json src/gift-store/storefront/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY src/gift-store/commerce src/gift-store/commerce
COPY src/gift-store/storefront src/gift-store/storefront

# Public (non-secret) build-time config, baked into the static bundle.
ARG VITE_APP_NAME="gift-store-storefront"
ARG VITE_TITLE="Unofficial FeatureOps Gift Store"
ARG VITE_API_URL="http://localhost:8081"
ARG VITE_PAYBRO_URL="http://localhost:8400"
ARG VITE_UNLEASH_URL=""
ARG VITE_UNLEASH_CLIENT_KEY=""
ARG VITE_NODE_ENV="development"
ARG VITE_UNLEASH_PROJECT_NUMBER="001"
ARG VITE_DEVTOOLS_ENABLED="true"
ARG VITE_UNLEASH_TOOLBAR_ENABLED="false"
RUN printf 'VITE_APP_NAME=%s\nVITE_TITLE=%s\nVITE_API_URL=%s\nVITE_PAYBRO_URL=%s\nVITE_UNLEASH_URL=%s\nVITE_UNLEASH_CLIENT_KEY=%s\nVITE_NODE_ENV=%s\nVITE_UNLEASH_PROJECT_NUMBER=%s\nVITE_DEVTOOLS_ENABLED=%s\nVITE_UNLEASH_TOOLBAR_ENABLED=%s\n' \
      "$VITE_APP_NAME" "$VITE_TITLE" "$VITE_API_URL" "$VITE_PAYBRO_URL" "$VITE_UNLEASH_URL" "$VITE_UNLEASH_CLIENT_KEY" "$VITE_NODE_ENV" "$VITE_UNLEASH_PROJECT_NUMBER" "$VITE_DEVTOOLS_ENABLED" "$VITE_UNLEASH_TOOLBAR_ENABLED" > .env \
  && pnpm --filter @gift-store/commerce build \
  && pnpm --filter @gift-store/storefront build

FROM nginx:1.27-alpine AS runtime
COPY src/gift-store/storefront/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/src/gift-store/storefront/dist /usr/share/nginx/html
EXPOSE 8080
