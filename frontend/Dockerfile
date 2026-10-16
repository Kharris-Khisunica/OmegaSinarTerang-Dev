# Frontend Nuxt — di-generate jadi static (SPA), disajikan Caddy.
# Stage build tidak ikut ke image akhir. Node 22 di stage build karena pnpm 11.

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Browser memanggil API lewat path relatif /api (di-proxy Caddy), bukan IP di kode.
ENV NUXT_PUBLIC_API_BASE=/api
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN pnpm exec nuxt generate

FROM caddy:2-alpine AS runtime
ENV TZ=Asia/Jakarta
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/.output/public /srv
EXPOSE 80
