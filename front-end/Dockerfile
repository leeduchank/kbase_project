# =====================================================
# Stage 1: Build the React/Vite frontend
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

# =====================================================
# Stage 2: Serve with lightweight Node server
# =====================================================
FROM node:20-alpine

WORKDIR /app

# Install serve globally (lightweight static file server with SPA support)
RUN npm install -g serve@14

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# -s flag = SPA mode (rewrites all routes to index.html)
# -l 3000 = listen on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
