# DSAverse LeetCode Sync Extension

Lightweight, privacy-preserving browser extension that connects your LeetCode problem submissions directly to your DSAverse AI Code Mentor workspace.

## Privacy & Security Guarantees
- **Zero Credential Access**: Never requests, accesses, or reads your LeetCode password, session tokens, or account credentials.
- **Zero Background Scraping**: Only executes when you actively click the extension popup on a LeetCode submission page.
- **Direct Local Sync**: Posts directly to your authenticated DSAverse instance at `localhost:3000` or can copy the JSON payload for 1-click clipboard paste.

## How to Install in Chrome / Edge
1. Open Chrome or Edge and navigate to `chrome://extensions` or `edge://extensions`.
2. Toggle on **Developer mode** in the top right / left.
3. Click **Load unpacked** and select the folder `tools/leetcode-sync-extension`.
4. The **DSAverse LeetCode Sync** extension icon will appear in your browser toolbar.

## How to Use
1. Open any LeetCode problem or submission page (e.g. `https://leetcode.com/problems/two-sum/submissions/`).
2. Click the DSAverse extension icon in your browser toolbar.
3. Click **Sync to DSAverse** to automatically push the code to your DSAverse workspace, or click **Copy Import Payload** to paste it in manually.
4. When you open AI Code Mentor in DSAverse, your submitted code will be preloaded with the provenance badge `"Automatically Imported (Authorized Integration)"`.
