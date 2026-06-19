# Self-contained multi-stage build for the Backstage + Unleash example.
# Everything (install, tsc, bundle) happens inside Docker, so `docker compose up --build`
# needs no prior host build. See https://backstage.io/docs/deployment/docker#multi-stage-build
#
# Node 22: satisfies Backstage's required `22 || 24`, matches the monorepo's pinned Node 22,
# and is within the Unleash plugin's supported `20 || 22`.

# ---- Stage 1: build the backend bundle -------------------------------------------------------
FROM node:22-bookworm AS build
ENV PYTHON=/usr/bin/python3
WORKDIR /app

# Native build deps for node-gyp / better-sqlite3.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

# Whole project (source included — see .dockerignore).
COPY . .

# Install, typecheck, and produce packages/backend/dist/{skeleton,bundle}.tar.gz.
RUN yarn install --immutable
RUN yarn tsc
RUN yarn build:backend

# ---- Stage 2: lean runtime -------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV PYTHON=/usr/bin/python3
# Switches many Node deps to production mode; disable node snapshot for the scaffolder.
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

# Build deps to compile better-sqlite3 during `yarn workspaces focus --production`.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential libsqlite3-dev curl && \
    rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /app

# Yarn release + config first (better layer caching).
COPY --from=build --chown=node:node /app/.yarn ./.yarn
COPY --from=build --chown=node:node /app/.yarnrc.yml /app/backstage.json ./

# Install production dependencies from the skeleton.
COPY --from=build --chown=node:node /app/yarn.lock /app/package.json /app/packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz
RUN --mount=type=cache,target=/home/node/.cache/yarn,sharing=locked,uid=1000,gid=1000 \
    yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# App config, the bundled backend, the owner catalog, and the startup scripts.
COPY --from=build --chown=node:node /app/app-config.yaml /app/app-config.docker.yaml ./
COPY --from=build --chown=node:node /app/packages/backend/dist/bundle.tar.gz ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz
COPY --from=build --chown=node:node /app/catalog ./catalog
COPY --from=build --chown=node:node /app/scripts ./scripts
RUN chmod +x ./scripts/entrypoint.sh

EXPOSE 7007
ENTRYPOINT ["sh", "scripts/entrypoint.sh"]
