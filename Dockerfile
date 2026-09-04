FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
RUN addgroup -g 10001 hodgeform && adduser -D -u 10001 -G hodgeform hodgeform
COPY --from=build /app/.output ./.output
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
USER hodgeform
EXPOSE 3000
CMD ["sh","-c","node scripts/migrate.mjs && node .output/server/index.mjs"]
