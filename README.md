# DSA Admin Dashboard

The dashboard uses a same-origin Node.js/Express API and MongoDB for shared data and admin sessions. Opening `index.html` directly or hosting only static files is unsupported because protected data operations require the server.

## Authentication and security

- Admin accounts remain in MongoDB's `admins` collection. Existing community members stay linked through `memberAuthLinks`; Firebase UIDs are unique. New verified Google identities receive their own `memberProfiles` record and never inherit an existing member's mapping.
- Google Sign-In uses the Firebase web SDK. The server verifies every login ID token with the Firebase Admin SDK, including Firebase revocation checks, requires the Google provider claim and verified email, then creates or restores only that identity's member session. Admin and member roles remain separate.
- A verified Google email matching the existing primary admin record receives that admin role. If the existing Krish LeetCode mapping identifies exactly one group member, login links the verified Firebase UID to that member's existing ID; conflicts stop login with an explicit error. Other Google accounts cannot receive admin privileges.
- Admin login retains full dashboard access. A member session can read and update only that member's daily and concept status; member requests cannot supply a member ID. Existing group, report, leaderboard, and admin APIs remain admin-only.
- A member lands on their personal profile after login. It shows their verified Google name and photo when available, their mapped LeetCode username, and cached total/easy/medium/hard solved counts. A new member can link only their own LeetCode username; the server verifies it before saving the cached counts.
- Profile pages use `/profile/:memberId`; admins can open group member profiles, and member sessions can open only their own. LeetCode profile counts come from the existing public profile fetch/cache, with total computed from the Easy, Medium, and Hard categories.
- `npm.cmd run provision-admin` inserts a single primary admin and refuses to overwrite an existing account.
- Express sessions are stored in MongoDB, rotate on successful login, and last up to seven days with a rolling HttpOnly, SameSite Lax cookie. Production cookies are Secure, and Express trusts one deployment proxy hop in production. Sessions expire after seven days without activity.
- Login attempts are rate-limited in MongoDB. State-changing requests reject cross-origin Origin and Fetch Metadata headers.
- Shared dashboard data, page projections, imports, audit records, Google account links, and admin actions require the server-side admin session. Member progress uses dedicated server routes and resolves ownership from the member session. Existing progress collections are not migrated or rewritten.

## Local setup

Use Node.js 20 or 22 and a reachable MongoDB database. MongoDB Node.js driver 6.21 is not listed as compatible with Node.js 24. In Windows PowerShell:

```powershell
Copy-Item .env.example .env
# Edit .env and set MONGODB_URI, SESSION_SECRET, Firebase values, ADMIN_EMAIL, ADMIN_PASSWORD, and CRON_SECRET.
npm.cmd install
npm.cmd run provision-admin
npm.cmd start
```

Set these environment variable names in local `.env` or the deployment environment:

- `MONGODB_URI`: URI for the app's MongoDB database. The app uses separate collections for sessions, rate limits, admin accounts, member links, and dashboard data.
- `SESSION_SECRET`: at least 32 unpredictable characters. To create a candidate locally, run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and keep its output private.
- `NODE_ENV`: set to `production` in production to enable Secure cookies and trusted proxy handling.
- `PORT`: optional; defaults to 3000.
- `CRON_SECRET`: required for scheduled LeetCode refresh endpoints.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: required only while running the one-time provisioning command. Use your own email and a unique password between 14 and 72 UTF-8 bytes. The running server authenticates from the stored MongoDB hash; these variables can be removed after provisioning.
- `MEMBER_ALLOWLIST_EMAILS`: comma, semicolon, or whitespace separated verified Google emails authorized for the existing private group. Sign in as an admin once and use **Members → Set sign-in email** to link each configured email to its existing member record. The server normalizes case and whitespace, rejects duplicates, and never exposes this environment value to the browser.
- `MEMBER_SELF_REGISTRATION`: optional. Omit it or set it to `true` to allow verified Google accounts to create a personal profile without private-group membership. Set it to `false` to disable new personal-profile registration. This setting does not grant group membership or admin access.
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, and `FIREBASE_APP_ID`: public Firebase web configuration from **Project settings → General → Your apps → Web app**.
- `GOOGLE_APPLICATION_CREDENTIALS`: optional path to an untracked service-account JSON file used as the local ADC source. If this is unset, Firebase Admin uses another ADC source available in the environment. The Google Cloud CLI is not required.
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`: optional server-only Firebase Admin service-account fields for deployment. Set both together in the host's secret manager; never commit them.

### Firebase credentials by environment

For local development, set `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, and `FIREBASE_APP_ID`. Firebase Admin also needs an ADC credential available to the local process. The usual local setup is an untracked service-account JSON key from the same Firebase project, selected by setting `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path; another ADC source already available in the environment also works. Do not set `FIREBASE_CLIENT_EMAIL` or `FIREBASE_PRIVATE_KEY` locally when using ADC. No Google Cloud CLI installation is needed.

For deployment, set the four public web configuration variables plus both `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in the deployment provider's secret manager. These two values are the Firebase Admin service-account credential; deployment does not need `GOOGLE_APPLICATION_CREDENTIALS` when using them. Do not set only one of the two. The server rejects incomplete service-account configuration and does not log credential values.

Provisioning is insert-only. If the primary admin already exists, the command exits without changing the account. To change a password later, use an explicitly reviewed administrative database procedure; rerunning the provisioner cannot reset it.

Run `npm.cmd run diagnose-mongodb` to check URI syntax, SRV/DNS lookup, TCP reachability, and the MongoDB TLS/authentication handshake. The command uses bounded timeouts and prints sanitized error identifiers plus discovered SRV target hostnames and ports; it never prints the URI, credentials, paths, or query parameters.

Open `http://localhost:3000` and choose **Admin Login** or **Member Login**. Member sign-in requires a verified Google email. An existing linked UID resolves to its original member record; a new verified UID creates one separate member profile and starts with no LeetCode mapping. Existing mappings remain managed through the administrator's member-link control. On the first run against an empty dashboard database, use **Import this browser's existing data** to copy the existing browser's local data. Import is a one-time insert and does not overwrite initialized MongoDB data. Use the Backup button before moving existing browser data to another browser, and keep backups private.

If Firebase reports an API-key or configuration error, compare all four web settings as one set: API key, project ID, auth domain, and app ID. Confirm Google is enabled under **Authentication → Sign-in method**, and add each deployed hostname under **Authentication → Settings → Authorized domains**. In Google Cloud, confirm the key belongs to the same project, its application/API restrictions allow Firebase Authentication requests, and the Identity Toolkit API has not been disabled. Check that the Firebase Admin service account uses the same project ID. The application deliberately does not validate, rotate, or log API keys or service-account credentials.

## Existing dashboard features

Daily and concept tracking, member management, dense leaderboard ranking, the 75% qualification rule, weekly selection, JSON backup/restore, and print/PDF export remain available. Shared data is stored in the existing `dashboard` record. Server data is not automatically initialized or overwritten at startup.

Persistent Node servers collect the eight mapped public LeetCode profiles every 15 minutes and schedule finalization for the prior activity date at 05:30 Asia/Kolkata. Submission history is deduplicated in `leetcodeSubmissions`; a submission of any verdict counts as an attempt. The current tracker has no daily-question assignment, so activity means any submission by that member on that date. Records never observed cannot be recovered later.

Finalization marks Done when stored or freshly fetched submissions prove an attempt. It marks Not Submitted only when a fresh response has fewer than 20 records and reaches earlier than the activity date; incomplete responses, API failures, capped results, and existing manual Done statuses are reported as Needs review. An authenticated admin can resolve those entries. Manual decisions record the admin and timestamp; retries preserve manual decisions and verified Done outcomes.

Vercel's activity cron runs at 00:00 UTC (05:30 IST) using `CRON_SECRET`. Its daily cron allowance does not support 15-minute collection, so a Vercel deployment cannot guarantee collection throughout the day. A sleeping or stopped Render process also cannot collect while offline; startup catch-up uses stored history and fresh public data and flags gaps it cannot verify.

## Deployment

Create a MongoDB database, restrict network access to the application host where practical, and use a database user scoped to this app. Configure MongoDB backups independently from dashboard JSON backups.

### Render

Set runtime variables `NODE_ENV`, `MONGODB_URI`, `SESSION_SECRET`, `CRON_SECRET`, the four public Firebase web variables, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in the Render service environment. Configure the `admins` document once by running `npm.cmd run provision-admin` from a trusted machine with `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` set for the intended database. Remove the temporary admin provisioning variables from the deployment environment after setup. Do not add `.env` or credentials to Git.

### Vercel

Vercel serves the root Express app as a serverless function and static files from `public/`. Set `NODE_ENV`, `MONGODB_URI`, `SESSION_SECRET`, `CRON_SECRET`, the four public Firebase web variables, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in Vercel's Environment Variables for each environment that should run the app. Provision the MongoDB admin once from a trusted machine using the production database and the temporary `ADMIN_EMAIL` and `ADMIN_PASSWORD` variables, then remove them from deployment settings. Allow the deployment to reach MongoDB using an appropriately scoped network rule.

Run `npm.cmd run vercel-build` after frontend edits to sync `index.html`, `style.css`, `activity-date.js`, `firebase-client.js`, and `script.js` into `public/`. `vercel.json` configures security headers. The app exports the Express instance for Vercel and opens a local port only when started directly.

MongoDB connection and index setup are lazy and share a guarded initialization promise per server instance. The same MongoDB client backs dashboard data and `connect-mongo` sessions; initialization can retry after a failed connection. Vercel instances can cold-start or scale independently; MongoDB remains the durable data and session store.

Do not commit `.env`, production secrets, backups, or database credentials. `.gitignore` excludes local environment files, service-account JSON patterns, private keys, and `node_modules`.

## Verification

Run `npm.cmd test` for the unit and HTTP-session tests. Run `npm.cmd run vercel-build` to refresh static assets. A real login and data-persistence check additionally requires reachable MongoDB and an admin account provisioned in that database; production cookie behavior requires HTTPS in the deployed environment.
