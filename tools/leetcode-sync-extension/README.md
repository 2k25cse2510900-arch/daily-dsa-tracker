# DSAverse LeetCode Auto-Sync Extension

Lightweight, privacy-preserving browser extension that automatically connects your LeetCode problem submissions directly to your DSAverse Daily Activity and AI Code Mentor workspace.

## Privacy & Security Guarantees
- **Zero Credential Access**: Never requests, accesses, or reads your LeetCode password, session tokens, or account credentials.
- **Zero Background Scraping**: Passive listener that executes strictly inside your active problem tab when you submit code.
- **Direct Local Sync**: Posts directly to your authenticated DSAverse instance at `localhost:3000` or `127.0.0.1:3000`.
- **Automatic Retry Queue**: If your DSAverse dashboard is temporarily unreachable, submissions are safely enqueued in `chrome.storage.local` and retried with exponential backoff and jitter.

## How It Works
1. When you click **Submit** (or press `Ctrl+Enter`) on any LeetCode problem, the extension captures the exact code snapshot and programming language.
2. The extension listens for LeetCode to finish judging your submission.
3. Once judging completes, it automatically packages the problem slug, title, difficulty, submitted code, language, runtime, memory, and final verdict (`Accepted`, `Wrong Answer`, `Time Limit Exceeded`, `Runtime Error`, etc.).
4. The submission is automatically synchronized to your authenticated DSAverse account.
5. In your DSAverse dashboard:
   - Your Daily Activity card shows **✓ Synced**.
   - Opening AI Code Mentor preloads your exact code, language, problem details, and verdict.
   - You can immediately click **✨ Get AI Analysis** without manually copying, pasting, or importing!

## How to Install in Chrome / Edge
1. Open Chrome or Edge and navigate to `chrome://extensions` or `edge://extensions`.
2. Toggle on **Developer mode**.
3. Click **Load unpacked** and select the folder `tools/leetcode-sync-extension`.
4. The **DSAverse LeetCode Sync** extension icon will appear in your browser toolbar.
