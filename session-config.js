"use strict";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL_SECONDS = SESSION_MAX_AGE_MS / 1000;

function createAdminSessionOptions({ secret, store, production = false }) {
  return {
    name: "dsa.sid",
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS,
      path: "/"
    }
  };
}

module.exports = { SESSION_MAX_AGE_MS, SESSION_TTL_SECONDS, createAdminSessionOptions };
