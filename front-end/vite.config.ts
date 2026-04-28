import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Tắt Cloudflare adapter — deploy trên EC2 bằng Node server thuần
  cloudflare: false,
  vite: {
    server: {
      port: 3000,
      strictPort: true,
    },
  },
});