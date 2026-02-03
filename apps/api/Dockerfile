# =============================================================================
# BuildTrack API - Multi-stage Production Dockerfile
# =============================================================================
# Stage 1: Dependencies
# Stage 2: Build (with Turbo pruning)
# Stage 3: Production runtime
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# Install necessary build dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: Install dependencies
# -----------------------------------------------------------------------------
FROM base AS deps

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json files for all workspaces
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Build
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source files
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build the API
RUN pnpm turbo run build --filter=@buildtrack/api

# Prune dev dependencies
RUN pnpm prune --prod

# -----------------------------------------------------------------------------
# Stage 4: Production runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 buildtrack

# Set environment
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Copy built application
COPY --from=builder --chown=buildtrack:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=buildtrack:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=buildtrack:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=buildtrack:nodejs /app/packages/database/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user
USER buildtrack

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]
