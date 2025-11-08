# Algod Proxy --- Secure Public API Gateway

Lightweight Express-based proxy for safely exposing selected
**Algorand/Voi** `algod` endpoints over HTTPS.\
Ideal for dApps or public services that need blockchain access without
exposing node tokens.

------------------------------------------------------------------------

## ✨ Features

-   🔒 Safe allowlist for read-only and limited POST routes\
-   🚀 Supports `POST /v2/transactions` (broadcast) and `simulate`\
-   ⚙️ Environment-based configuration for node URI and token file\
-   🌐 CORS enabled for web apps\
-   🧩 Simple rate limiting for transaction spam prevention\
-   🩺 `/health` endpoint for uptime checks

------------------------------------------------------------------------

## ⚙️ Environment Variables

  --------------------------------------------------------------------------------------
  Variable               Default                             Description
  ---------------------- ----------------------------------- ---------------------------
  `ALGOD_HOST`           `http://127.0.0.1:8082`             Algod RPC endpoint

  `ALGOD_TOKEN_FILE`     `/usr/share/func/voi/algod.token`   Path to algod token file
  --------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 🚀 Usage

``` bash
npm install
ALGOD_HOST=http://127.0.0.1:8082 ALGOD_TOKEN_FILE=/usr/share/func/voi/algod.token node proxy.js
```

------------------------------------------------------------------------

## 🔗 Example Endpoints

    GET  /v2/status
    GET  /v2/transactions/params
    GET  /v2/accounts/{address}
    GET  /v2/transactions/pending/{txid}?format=msgpack
    POST /v2/transactions
    POST /v2/transactions/simulate

------------------------------------------------------------------------

## 🧱 Deployment

Bind to localhost (`127.0.0.1`) and serve over HTTPS via **Caddy**,
**Nginx**, or another reverse proxy:

``` bash
localhost:3001 -> https://mainnet-api.voi.dork.fi
```

------------------------------------------------------------------------

## 📄 License

MIT License © 2025 Nautilus Labs
