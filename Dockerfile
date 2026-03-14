# =============================================================================
# Frontend: Multi-stage build — Node (build) → nginx (serve)
# =============================================================================

# --- Stage 1: Install dependencies ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Build the Vite/React app ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json vite.config.ts index.html vite-env.d.ts ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# --- Stage 3: Serve with nginx ---
FROM nginx:1.27-alpine AS runtime

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

ENV BACKEND_ORIGIN=http://backend:8000
ENV BACKEND_HOST=backend
ENV API_BASE_URL=""

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1

CMD ["/bin/sh", "-c", "\
  if [ -n \"$API_BASE_URL\" ]; then \
    echo \"window.__API_BASE_URL__ = '$API_BASE_URL';\" > /usr/share/nginx/html/env-config.js; \
  else \
    echo '' > /usr/share/nginx/html/env-config.js; \
  fi && \
  envsubst '${BACKEND_ORIGIN} ${BACKEND_HOST}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && \
  nginx -g 'daemon off;'"]
