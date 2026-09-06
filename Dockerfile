FROM node:22-alpine AS build
RUN apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
RUN apk upgrade --no-cache \
 && addgroup -g 10001 hodgeform \
 && adduser -D -u 10001 -G hodgeform hodgeform \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/pnpm /usr/local/bin/pnpx
COPY --chown=hodgeform:hodgeform --from=build /app/.output ./.output
COPY --chown=hodgeform:hodgeform --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --chown=hodgeform:hodgeform --from=build /app/scripts/migration-plan.mjs ./scripts/migration-plan.mjs
COPY --chown=hodgeform:hodgeform --from=build /app/scripts/provision-operator.mjs ./scripts/provision-operator.mjs
COPY --chown=hodgeform:hodgeform --from=build /app/scripts/bootstrap-operator.mjs ./scripts/bootstrap-operator.mjs
COPY --chown=hodgeform:hodgeform --from=build /app/migrations ./migrations
COPY --chown=hodgeform:hodgeform --from=build /app/node_modules ./node_modules
USER hodgeform
EXPOSE 3000
CMD ["sh","-c","node scripts/migrate.mjs && node scripts/bootstrap-operator.mjs && node .output/server/index.mjs"]
