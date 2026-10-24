"use strict";

require("dotenv").config();

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const { provisionInitialAdmin, validateAdminCredentials } = require("../admin-auth");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (typeof uri !== "string" || !uri.trim()) throw new Error("MONGODB_URI is required.");
  const credentials = validateAdminCredentials(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  if (!credentials || Buffer.byteLength(credentials.password, "utf8") < 14) {
    throw new Error("ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be 14-72 UTF-8 bytes.");
  }
  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    const admins = client.db().collection("admins");
    await admins.createIndex({ email: 1 }, { unique: true });
    await provisionInitialAdmin({
      collection: admins,
      email: credentials.email,
      password: credentials.password,
      hashPassword: (value, rounds) => bcrypt.hash(value, rounds)
    });
    console.log("Initial admin account created.");
  } catch (error) {
    if (error?.code === 11000 || error?.code === 11001) {
      console.error("An admin account is already provisioned; no account was changed.");
    } else {
      console.error(error?.message?.startsWith("ADMIN_EMAIL") ? error.message : "Admin provisioning failed. Check required settings and MongoDB connectivity.");
    }
    process.exitCode = 1;
  } finally {
    await client?.close().catch(() => {});
  }
}

main().catch(error => {
  const message = error?.message;
  if (message === "MONGODB_URI is required." || message === "ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be 14-72 UTF-8 bytes.") {
    console.error(message);
  } else {
    console.error("Admin provisioning stopped. Check required settings and MongoDB connectivity.");
  }
  process.exitCode = 1;
});
