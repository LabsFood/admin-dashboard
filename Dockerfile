# syntax=docker/dockerfile:1.7
FROM node:24.22.1-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.22.1-alpine3.24 AS builder
WORKDIR /app

# Variables consommées AU BUILD :
#  - NEXT_PUBLIC_API_URL est inlinée dans le bundle client par Next (le .env
#    n'est pas copié dans l'image, cf. .dockerignore) ;
#  - API_PROXY_TARGET est figée dans le routes-manifest par le rewrite.
# Les deux ont un défaut sain, ces ARG ne servent qu'à surcharger.
ARG NEXT_PUBLIC_API_URL
ARG API_PROXY_TARGET
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    API_PROXY_TARGET=${API_PROXY_TARGET:-https://lf-api.labsfood.fr}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24.22.1-alpine3.24 AS runtime
WORKDIR /app

RUN apk update && apk upgrade --no-cache

ENV NODE_ENV=production \
    PORT=3000

RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/standalone ./
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/static ./.next/static

USER nodeapp

EXPOSE 3000

CMD ["node", "server.js"]
