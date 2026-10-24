"use strict";

const { applicationDefault, cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function requiredFirebaseClientConfig(env = process.env) {
  const config = { apiKey: env.FIREBASE_API_KEY, authDomain: env.FIREBASE_AUTH_DOMAIN, projectId: env.FIREBASE_PROJECT_ID, appId: env.FIREBASE_APP_ID };
  if (!Object.values(config).every(value => typeof value === "string" && value.trim())) return null;
  if (env.FIREBASE_MESSAGING_SENDER_ID) config.messagingSenderId = env.FIREBASE_MESSAGING_SENDER_ID;
  if (env.FIREBASE_STORAGE_BUCKET) config.storageBucket = env.FIREBASE_STORAGE_BUCKET;
  return config;
}

function firebaseCredentialFromEnv(env, { applicationDefault: defaultCredential = applicationDefault, cert: serviceAccountCredential = cert } = {}) {
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_PRIVATE_KEY;
  if (Boolean(clientEmail) !== Boolean(privateKey)) throw new Error("Firebase service-account credentials are incomplete.");
  if (!clientEmail) return defaultCredential();
  return serviceAccountCredential({ projectId: env.FIREBASE_PROJECT_ID, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") });
}

function createFirebaseTokenVerifier(env = process.env, dependencies = {}) {
  const {
    applicationDefault: defaultCredential = applicationDefault,
    cert: serviceAccountCredential = cert,
    getApps: existingApps = getApps,
    initializeApp: createApp = initializeApp,
    getAuth: firebaseAuth = getAuth
  } = dependencies;
  let auth;
  return async idToken => {
    if (!auth) {
      const projectId = env.FIREBASE_PROJECT_ID;
      if (typeof projectId !== "string" || !projectId.trim()) throw new Error("Firebase project ID is not configured.");
      const credential = firebaseCredentialFromEnv(env, { applicationDefault: defaultCredential, cert: serviceAccountCredential });
      const app = existingApps().find(candidate => candidate.name === "member-auth") || createApp({ credential, projectId }, "member-auth");
      auth = firebaseAuth(app);
    }
    return auth.verifyIdToken(idToken, true);
  };
}

module.exports = { requiredFirebaseClientConfig, firebaseCredentialFromEnv, createFirebaseTokenVerifier };
