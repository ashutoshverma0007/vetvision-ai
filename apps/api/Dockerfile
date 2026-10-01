FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and package descriptors
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY prisma/ ./prisma/

# Install and build packages and API
RUN npm install
RUN npm run build --workspace=@vetvision/shared-types
RUN npm run build --workspace=@vetvision/validation
RUN npm run build --workspace=@vetvision/config
RUN npx prisma generate
RUN npm run build --workspace=@vetvision/api

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY prisma/ ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
