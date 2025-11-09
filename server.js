// proxy.js
import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const ALGOD_HOST = process.env.ALGOD_HOST || "http://127.0.0.1:8082";
const ALGOD_TOKEN_FILE = process.env.ALGOD_TOKEN_FILE || "/usr/share/func/voi/algod.token";
const ALGOD_TOKEN = fs.readFileSync(ALGOD_TOKEN_FILE, "utf8").trim();
const PORT=process.env.PORT || 3001

const app = express();

app.use((req, res, next) => {                                                
  res.header("Access-Control-Allow-Origin", "*"); // or "https://yourapp"    
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");  
  // handle preflight early
  if (req.method === "OPTIONS") {                                            
    return res.sendStatus(200); 
  } 
  next();                                                                    
});

// Address: Algorand is base32 (A–Z, 2–7), 58 chars. Case-insensitive just in case.
const ADDR = "[A-Z2-7]{58}";

// Allowlist (regexes are case-insensitive when marked with /i)
const ALLOWLIST = [
  /^\/v2\/status$/i,
  /^\/v2\/status\/wait-for-block-after\/\d+$/i,
  /^\/v2\/transactions\/params$/i,
  new RegExp(`^/v2/accounts/${ADDR}$`, "i"),
  /^\/v2\/blocks\/\d+$/i,
  // NEW: account asset lookup
  new RegExp(`^/v2/accounts/${ADDR}/assets/\\d+$`, "i"),
  // Simulate endpoint (POST allowed)
  /^\/v2\/transactions\/simulate$/i,
  // Post transaction
  /^\/v2\/transactions$/i, 
  // Allow pending transaction lookup by txid (path only; querystring like ?format=msgpack is preserved)
  new RegExp(`^/v2/transactions/pending/[A-Z2-7]{52}$`, "i"),
  // Application lookup
  /^\/v2\/applications\/\d+$/i,
];

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Simple rate limiter for /v2/transactions (optional but good)
const txHits = new Map();
const TX_WINDOW_MS = 10_000; // 10s
const TX_MAX = 100; // max 100 reqs/IP/10s (tune as needed)

function txRateLimit(req, res, next) {
  if (!/^\/v2\/transactions$/i.test(req.path)) return next();

  const now = Date.now();
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const entry = txHits.get(ip) || { count: 0, ts: now };

  if (now - entry.ts > TX_WINDOW_MS) {
    entry.count = 0;
    entry.ts = now;
  }

  entry.count++;
  txHits.set(ip, entry);

  if (entry.count > TX_MAX) {
    return res.status(429).json({ error: "Too many transaction submissions" });
  }

  next();
}

app.use(txRateLimit);

// Enforce allowlist + method rules
app.use((req, res, next) => {
  const path = req.path; // no querystring
  const allowed = ALLOWLIST.some(rx => rx.test(path));
  if (!allowed) return res.status(403).json({ error: "Endpoint not allowed" });

  // Only GET allowed, except simulate which must be POST
  if (req.method !== "GET") {
    if (req.method === "POST" && /^\/v2\/transactions\/simulate$/i.test(path)) return next();
    if (/^\/v2\/transactions$/i.test(path)) return next(); 
    return res.status(403).json({ error: "Method not allowed" });
  }
  next();
});

// Proxy forward (inject token; stream body for POST simulate)
app.use(async (req, res) => {
  try {
    const url = ALGOD_HOST + req.originalUrl; // keep querystring (e.g., ?format=msgpack)
    const opts = {
      method: req.method,
      headers: { "X-Algo-API-Token": ALGOD_TOKEN },
    };
    if (req.method === "POST") {
      opts.body = req; // stream raw body
      opts.headers["Content-Type"] = req.headers["content-type"] || "application/msgpack";
    }
    const upstream = await fetch(url, opts);
    res.status(upstream.status);
    res.header("Access-Control-Allow-Origin", "*");
    upstream.body.pipe(res);
  } catch (err) {
    res.status(502).json({ error: "Proxy error", detail: err.message });
  }
});

// Bind to localhost only; Caddy fronts it over HTTPS
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Algod read-only proxy on ${ALGOD_HOST}`);
});

