FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build
RUN ls -la dist/src/ && ls -la dist/src/main.js

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install wget for healthcheck
# Force rebuild: 2026-01-18-v3
RUN apk add --no-cache wget

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p uploads/avatars uploads/experiences && chown -R nestjs:nodejs uploads

USER nestjs

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && if [ \"$RUN_SEED\" = \"true\" ]; then npx prisma db seed; fi && node dist/src/main.js"]
