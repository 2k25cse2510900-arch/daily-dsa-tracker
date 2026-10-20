# DSA Admin Dashboard

The dashboard now uses a same-origin Node.js API and MongoDB for shared state. Opening `index.html` directly or serving these files from a static-only host is intentionally unsupported: the browser-only version cannot enforce shared-data authorization.

## Architecture and security

- `server.js` serves the API and local frontend. The Vercel build copies the root frontend files to `public/`, where Vercel serves them as CDN assets.
- MongoDB stores the shared dashboard, server sessions, rate-limit counters, and a small audit trail.
- Krish signs in with the server-side `ADMIN_PASSWORD` secret. The server hashes it at startup and never sends credentials or hashes to the browser.
- Session cookies are HttpOnly and SameSite Strict. Production cookies are Secure and require HTTPS.
- Every shared-state write and import endpoint checks the server-side admin session and validates the payload.
- All six pages are publicly viewable without login or page codes. Each viewer endpoint returns only a page-specific projection; the full tracker object is available only to an authenticated admin. Daily and concept pages return their respective statuses, the overview returns summaries, and the leaderboard returns calculated scores and ranks.
- Admins sign in from the header. The session is stored server-side in MongoDB; every state-changing request checks that session and validates the submitted tracker data. Public views cannot change shared state.
- Monthly records are not currently represented by dated records; the dashboard's existing numbered weeks do not establish month boundaries.

## Local setup

Use Node.js 20 or newer and a MongoDB database. In PowerShell:

```powershell
Copy-Item .env.example .env
# Edit .env with a MongoDB URI and new secret values.
npm.cmd install
npm.cmd start
```

Set these values in `.env` locally or in your hosting provider's secret manager:

- `MONGODB_URI`: MongoDB connection URI for a dedicated database.
- `SESSION_SECRET`: at least 32 random characters. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `ADMIN_PASSWORD`: unique password of 14–72 UTF-8 bytes for the Krish account.
- `NODE_ENV=production` in production; this enables Secure cookies and proxy handling.
- `PORT`: optional; defaults to 3000.

Visit `http://localhost:3000`. Sign in as `Krish`. On the first run, choose **Import this browser's existing data** to copy the existing browser's localStorage data into an empty shared database. This is a one-time insert and returns an error if shared data already exists. It does not run automatically or overwrite server data.

If you run the app on a different browser from where the old dashboard data is saved, use the old dashboard's Backup button first, then restore that backup in an admin session after shared data is initialized. Keep a private copy of the backup.

## Page access and credentials

Sessions expire after eight hours of inactivity; use **Log out** to end the current session immediately. Changing `ADMIN_PASSWORD` and restarting also invalidates previous admin sessions. Visitors can view every page without credentials. Admin edits require the authenticated session; the dashboard also checks same-origin state-changing requests.

## Database and deployment

Create a MongoDB database (for example, a MongoDB Atlas cluster), restrict its network access to the application host where possible, and use a database user with access only to this app's database. Backups should be configured in MongoDB and separately for exported dashboard JSON as appropriate.

### Vercel

Vercel detects the root `server.js` Express app as one serverless function. It serves static files from `public/` through its CDN and does not use `express.static()` for this. The deployment includes synced copies of the maintained root `index.html`, `style.css`, and `script.js` in `public/`; run `npm run vercel-build` after frontend edits to refresh them. A test checks that these files stay in sync. `vercel.json` configures security headers. The app exports the Express instance for Vercel and only opens a port when started directly, so local `npm.cmd start` remains available.

MongoDB connection and index setup is lazy and guarded by shared promises per function instance. Concurrent cold requests share one initialization, the same Mongo client backs the dashboard and `connect-mongo` sessions, and initialization can retry after a failed connection. Vercel instances can still cold start or scale independently; MongoDB Atlas remains the durable source of data and sessions.

Next steps:

1. Push this project to a Git provider, or install the Vercel CLI and run `vercel link` from this folder.
2. Before committing later frontend changes, run `npm run vercel-build` and commit the updated `public/` copies along with the root source files.
3. In Vercel Project Settings → Environment Variables, add `MONGODB_URI`, `SESSION_SECRET`, and `ADMIN_PASSWORD` for Production (and Preview if you will use preview deployments). Use the existing private values through the Vercel UI/secret input; do not add `.env` to Git. Set `NODE_ENV` to `production` if it is not supplied automatically. `PORT` is optional on Vercel.
4. Allow the Vercel deployment to connect to MongoDB Atlas using an appropriate Atlas network access configuration. Prefer Vercel Static IPs/Secure Compute where available; avoid broad public access rules when possible.
5. Deploy a preview with `vercel`, then verify static assets, all six public pages, admin login/logout, rejected anonymous writes, and persistence. Deploy production only after preview verification with `vercel --prod` (or use Vercel’s Git integration).

The project has not been deployed or tested in Vercel. Local `npm.cmd start` uses the same app and security middleware, but only a deployed preview can verify Vercel routing, static delivery, production cookies, and runtime limits.

Do not commit `.env`, production secrets, backups, or database credentials. `.gitignore` excludes local environment files and `node_modules`.

## Existing features

Daily and concept tracking, member management, dense leaderboard ranking, the 75% qualification rule, weekly selection, JSON backup/restore, and print/PDF export remain in the existing dashboard. In shared mode, edits save to the server; viewers can only read. Server data is not automatically initialized or overwritten at startup.

## Verification status

Run `npm.cmd install` and `npm.cmd start` after supplying MongoDB and secret settings. Run `npm.cmd test` for the scoring/ranking tests and Vercel asset-copy check. Authentication, MongoDB persistence, rate limits, HTTPS cookies, browser UI behavior, cross-browser consistency, and Vercel's routing/runtime behavior require a configured MongoDB instance and must be exercised against the running app or a Vercel preview.
