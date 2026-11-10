# Security and public deployment

The suite was built to run on your own computer. Every server listens on
`127.0.0.1` only, so nobody else on your network or the Internet can reach it.
Putting it online changes that, so read this file first.

## What the code already protects

| Area | Protection |
|---|---|
| Network | All servers bind to `127.0.0.1` (ETF 8000, Stock API 3001, apps 5173/5174, dashboard 5050). |
| Input | Symbols in URLs and request bodies must match `A-Z 0-9 . - = ^ _`, max 20 characters. Anything else gets a `400`. |
| Request size | ETF API rejects bodies over 64 KB (`413`). Lists are capped: 5–10 symbols per comparison, 50 holdings per portfolio. |
| Saved data | Watchlist max 200 symbols, alerts max 200, portfolios max 100, so nobody can fill the disk. Files are written atomically. |
| Errors | Server errors return a generic message. The real error goes only to the server log. |
| Info leaks | `/docs`, `/redoc` and `/openapi.json` are off (set `RAED_FINANCE_API_DOCS=1` to enable). `/api/storage-info` no longer returns the folder path. Express no longer sends `X-Powered-By`. |
| Browser headers | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`. |
| CORS | The Stock API answers only the Stock Comparison page (`127.0.0.1:5174` / `localhost:5174`), and only `GET`. Add a public domain with `ALLOWED_ORIGINS`. |
| Rate limit | Stock API: 120 requests per minute per IP. |
| XSS | Text from Yahoo and the fund data is escaped before it goes into the page. News links only open `http(s)` URLs. |
| Dependencies | FastAPI 0.162 / Starlette 1.x (older Starlette had known holes). `npm audit` is clean except one moderate `uuid` advisory inside `exceljs`, which this project does not use in an affected way. |
| Secrets | The repo has no API keys or passwords, and none in its git history either. `.env` files, logs and `*.db` are git-ignored. |

## Before putting it on the Internet

### 1. The biggest one: there are no accounts

Watchlist, alerts and portfolios are **one shared set of files**. If the site
is public, every visitor sees and can change the same data. Pick one:

- **Private site (recommended):** put a password in front of the whole site
  at the reverse proxy (see the example below). Only you get in.
- **Public site:** add user accounts first. That is a separate feature.

### 2. Hostinger: which plan

- **Shared / "Web" hosting cannot run this.** It only serves PHP and static
  files. It cannot keep a Python (FastAPI) or Node (Express) server running.
- **A Hostinger VPS (or any Linux VPS) can.** You get a full Linux machine.

### 3. Don't run dev servers in public

The launcher runs `npm run dev` (Vite dev server). That is fine locally but
not for the Internet. On a server:

```bash
cd project/apps/investment-calculator && npm ci && npm run build
cd ../stock-comparison-tool && npm ci && npm run build
```

Serve the `dist/` folders as static files through the proxy, and set
`VITE_API_URL=https://your-domain/stock-api/api` before building the stock app.

### 4. Put a reverse proxy in front (HTTPS + password)

Keep every app on `127.0.0.1`, and let one proxy face the Internet. Caddy
gets HTTPS certificates automatically. Example `Caddyfile`:

```
your-domain.com {
    basic_auth {
        # create the hash with:  caddy hash-password
        raed <paste-the-hash-here>
    }
    header Strict-Transport-Security "max-age=31536000"

    handle_path /calculator/* { root * /srv/raed/investment-calculator/dist; file_server }
    handle_path /stocks/*     { root * /srv/raed/stock-comparison-tool/dist; file_server }
    handle_path /stock-api/*  { reverse_proxy 127.0.0.1:3001 }
    handle                    { reverse_proxy 127.0.0.1:8000 }
}
```

Then start the Stock API with:

```bash
TRUST_PROXY=1 ALLOWED_ORIGINS=https://your-domain.com npm run server
```

`TRUST_PROXY=1` makes the rate limit use the visitor's real IP instead of the
proxy's. Only set it when a proxy is really in front.

### 5. Server basics

- Firewall: allow only ports 22, 80 and 443 (`ufw allow OpenSSH`, `ufw allow 80,443/tcp`, `ufw enable`).
- SSH with keys, not passwords. Turn off root login.
- Run the apps as a normal user (not root), as `systemd` services so they restart.
- Back up the data folder (`RAED_FINANCE_DATA_DIR`) regularly.
- Every few months, update dependencies and run `npm audit` and `pip-audit`.

### 6. Running it from your own PC for others

Possible, but it exposes your personal computer. If you do it, use a tunnel
(Cloudflare Tunnel or Tailscale) with a login in front, not router port
forwarding. Tailscale is the simplest when only you need access from your phone.

## Known limits (not fixed)

- The ETF page allows inline scripts in its CSP (`'unsafe-inline'`), because
  the page uses inline `onclick` handlers. Escaping protects against XSS today.
  Removing inline handlers would be a larger refactor.
- The ETF API has no rate limit of its own. Behind Caddy you can add one with
  the `rate_limit` plugin, or use Cloudflare in front.
