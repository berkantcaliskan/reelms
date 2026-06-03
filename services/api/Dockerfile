FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY services/api/package*.json services/api/
COPY packages/shared/package*.json packages/shared/
COPY packages/config/package*.json packages/config/
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:packages && npm run build:api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/config/dist ./packages/config/dist
CMD ["node", "services/api/dist/index.js"]
