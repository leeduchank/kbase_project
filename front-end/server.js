/**
 * Production Node.js HTTP server for TanStack Start SSR.
 *
 * The Vite build (with cloudflare: false) outputs dist/server/server.js
 * which exports a `default.fetch(Request)` handler but does NOT create
 * an HTTP server.  This wrapper turns that handler into a real listener.
 */

import { createServer } from "node:http";
import { Readable } from "node:stream";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, stat } from "node:fs/promises";

// ── Import the TanStack Start handler ──────────────────────────────
const { default: app } = await import("./dist/server/server.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "dist", "client");

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

// ── MIME types for static assets ───────────────────────────────────
const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4":  "video/mp4",
  ".map":  "application/json",
};

/**
 * Try to serve a static file from dist/client.
 * Returns true if the file was served, false otherwise.
 */
async function serveStatic(req, res) {
  // Only serve GET/HEAD for static files
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Only serve /assets/* (Vite hashed assets)
  if (!pathname.startsWith("/assets/")) return false;

  const filePath = join(CLIENT_DIR, pathname);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;

    const ext = pathname.slice(pathname.lastIndexOf("."));
    const contentType = MIME[ext] || "application/octet-stream";

    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type":   contentType,
      "Content-Length":  data.byteLength,
      "Cache-Control":  "public, max-age=31536000, immutable",
    });
    if (req.method === "HEAD") { res.end(); } else { res.end(data); }
    return true;
  } catch {
    return false;
  }
}

// ── HTTP server ────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    // 1. Try static assets first
    if (await serveStatic(req, res)) return;

    // 2. Build a Web-standard Request from Node's IncomingMessage
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url.href, {
      method:  req.method,
      headers,
      body:    hasBody ? Readable.toWeb(req) : undefined,
      duplex:  "half",
    });

    // 3. Call the TanStack Start handler
    const response = await app.fetch(request);

    // 4. Send the Web Response back through Node's ServerResponse
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

    if (!response.body) {
      res.end();
      return;
    }

    // Stream the response body
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        const ok = res.write(value);
        if (!ok) await new Promise((resolve) => res.once("drain", resolve));
      }
    };
    await pump();
  } catch (err) {
    console.error("[server] Request handling error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
    }
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`✅ KBase Frontend SSR server listening on http://${HOST}:${PORT}`);
});
