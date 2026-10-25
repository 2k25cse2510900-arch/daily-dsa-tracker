"use strict";

// Historical reconciliation is intentionally report-only. Production wallet
// changes require a separately reviewed migration and explicit authorization.
console.error("CharacterVerse historical rewards are dry-run only; no balances were changed.");
process.exitCode = 1;
