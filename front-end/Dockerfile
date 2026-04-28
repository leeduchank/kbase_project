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

# Install serve globally
RUN npm install -g serve@14

# SỬA LẠI DÒNG NÀY: Copy thẳng nội dung trong client vào thư mục public của container
# Chúng ta bốc ruột của client ra ngoài để index.html nằm ngay ở thư mục gốc
COPY --from=builder /app/dist/client ./public

EXPOSE 3000

# Chỉ định serve chạy thư mục public
# -s flag: Cực kỳ quan trọng để không bị lỗi 404 khi bạn F5 trang web
CMD ["serve", "-s", "public", "-l", "3000"]