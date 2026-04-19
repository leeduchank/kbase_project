#!/bin/bash

# Demo: Cách làm manual đơn giản
# Thay vì dùng script phức tạp

echo "=== Cách làm manual đơn giản ==="
echo ""

echo "1. Xóa .git tổng ở root:"
echo "   rm -rf .git"
echo ""

echo "2. Tạo .git riêng cho từng service:"
echo "   cd kbase-discovery-server"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/your-org/kbase-discovery-server.git"
echo "   git push -u origin main"
echo "   cd .."
echo ""

echo "3. Lặp lại cho các service khác..."
echo ""

echo "=== Hoặc dùng script tự động ==="
echo "   ./setup-repos.sh"
echo ""

echo "Script sẽ hỏi GitHub URL cho từng repo!"