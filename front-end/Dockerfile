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
# Stage 2: Serve with Nginx
# =====================================================
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config for SPA routing
COPY front-end/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist/client /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
