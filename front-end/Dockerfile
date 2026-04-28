# =====================================================
# Stage 1: Build the React/TanStack Start frontend
# =====================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY front-end/package.json front-end/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY front-end/ .

# Build argument for API URL (injected at build time)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the production bundle
RUN npm run build

# Debug: show build output structure (visible in docker build logs)
RUN echo "=== Build Output ===" && find dist -maxdepth 3 -type f | sort

# =====================================================
# Stage 2: Run the SSR Node server
# =====================================================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy package files and install production deps only
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
RUN npm ci --omit=dev

# Copy the entire built output (server + client assets)
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Start the TanStack Start SSR server
CMD ["node", "dist/server/index.mjs"]