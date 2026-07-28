# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
ENV NODE_ENV=development NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY backend backend
COPY frontend frontend
COPY js js
COPY Laboratory Laboratory
COPY IJRLogo.webp IJRLogo.webp
COPY lab_distribution1.png lab_distribution1.png
COPY lab_distribution_map.png lab_distribution_map.png
RUN npm --workspace backend run db:generate \
    && npm --workspace frontend run build

FROM base AS production
ENV NODE_ENV=production \
    PORT=4000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_CACHE=/tmp/.npm
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend ./backend
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist
COPY --from=build --chown=node:node /app/js ./js
COPY --from=build --chown=node:node /app/Laboratory ./Laboratory
COPY --from=build --chown=node:node /app/lab_distribution1.png ./lab_distribution1.png
COPY --from=build --chown=node:node /app/lab_distribution_map.png ./lab_distribution_map.png

RUN mkdir -p /app/backend/uploads/reviews \
    && chown -R node:node /app/backend/uploads

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4000/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]
CMD ["node", "backend/src/server.js"]
