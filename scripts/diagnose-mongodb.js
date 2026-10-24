"use strict";

require("dotenv").config();

const { Resolver } = require("node:dns");
const net = require("node:net");
const tls = require("node:tls");
const { MongoClient } = require("mongodb");
const { safeMongoDiagnostic } = require("../diagnostics");

const DNS_TIMEOUT_MS = 8000;
const TCP_TIMEOUT_MS = 5000;
const CONNECT_TIMEOUT_MS = 15000;

function resolveRecord(method, name, timeoutMs) {
  const resolver = new Resolver();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolver.cancel();
      reject(Object.assign(new Error("DNS query timed out"), { code: "DIAGNOSTIC_TIMEOUT" }));
    }, timeoutMs);
    resolver[method](name, (error, records) => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(records);
    });
  });
}

function resolveHost(host, timeoutMs) {
  const resolver = new Resolver();
  return new Promise((resolve, reject) => {
    let completed = 0;
    let addresses = [];
    let lastError;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolver.cancel();
      reject(Object.assign(new Error("DNS query timed out"), { code: "DIAGNOSTIC_TIMEOUT" }));
    }, timeoutMs);
    const finish = (error, records) => {
      if (settled) return;
      if (error) lastError = error;
      else if (records.length) {
        addresses = addresses.concat(records);
        settled = true;
        clearTimeout(timer);
        resolver.cancel();
        resolve(addresses);
        return;
      }
      completed++;
      if (completed < 2) return;
      settled = true;
      clearTimeout(timer);
      if (addresses.length) resolve(addresses);
      else reject(lastError || Object.assign(new Error("No address records"), { code: "ENODATA" }));
    };
    resolver.resolve4(host, finish);
    resolver.resolve6(host, finish);
  });
}

function parseHosts(uri) {
  const scheme = uri.match(/^(mongodb\+srv|mongodb):\/\//i)?.[1]?.toLowerCase();
  if (!scheme) throw Object.assign(new Error("invalid connection string"), { name: "MongoParseError" });
  const authority = uri.slice(uri.indexOf("//") + 2).split(/[/?#]/, 1)[0];
  const hostList = authority.slice(authority.lastIndexOf("@") + 1);
  const hosts = hostList.split(",").map(value => {
    if (value.startsWith("[")) {
      const close = value.indexOf("]");
      const port = value.slice(close + 1).match(/^:(\d+)$/)?.[1];
      return { host: value.slice(1, close), port: Number(port) || 27017 };
    }
    const match = value.match(/^(.+?)(?::(\d+))?$/);
    return { host: match?.[1], port: Number(match?.[2]) || 27017 };
  }).filter(value => value.host);
  if (!hosts.length) throw Object.assign(new Error("missing host"), { name: "MongoParseError" });
  return { scheme, hosts };
}

function tcpProbe(host, port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let finished = false;
    const done = result => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(TCP_TIMEOUT_MS, () => done({ ok: false, code: "ETIMEDOUT" }));
    socket.once("connect", () => done({ ok: true }));
    socket.once("error", error => done({ ok: false, code: error.code || "UNKNOWN" }));
  });
}

function tlsProbe(host, port) {
  return new Promise(resolve => {
    // Preserve Node's default certificate and hostname validation. This probe
    // isolates the TLS handshake from the MongoDB wire protocol without
    // emitting peer certificate details or any connection-string data.
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: true });
    let finished = false;
    const done = result => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(TCP_TIMEOUT_MS, () => done({ ok: false, code: "ETIMEDOUT" }));
    socket.once("secureConnect", () => done({ ok: true }));
    socket.once("error", error => done({ ok: false, code: error.code || "UNKNOWN" }));
  });
}

function report(label, value) {
  process.stdout.write(`${label}=${value}\n`);
}

function safeEndpointHost(host) {
  // DNS target names are useful for troubleshooting, but never emit URI userinfo,
  // paths, query parameters, or arbitrary error text.
  return typeof host === "string" && /^[A-Za-z0-9.-]{1,253}$/.test(host) ? host : "UNKNOWN";
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    report("MONGODB_CHECK", "NOT_RUN");
    report("CATEGORY", "missing-configuration");
    process.exitCode = 2;
    return;
  }

  let parsed;
  try {
    parsed = parseHosts(uri);
    // Let the official driver validate all remaining URI syntax without logging it.
    const validationClient = new MongoClient(uri, { serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS });
    await validationClient.close();
  } catch (error) {
    const diagnostic = safeMongoDiagnostic(error);
    report("URI_FORMAT", "INVALID");
    report("CATEGORY", diagnostic.category);
    report("CODE", diagnostic.code);
    process.exitCode = 1;
    return;
  }

  report("URI_FORMAT", "VALID");
  report("URI_SCHEME", parsed.scheme);
  report("HOST_COUNT", parsed.hosts.length);

  let endpoints = [];
  if (parsed.scheme === "mongodb+srv") {
    try {
      const records = await resolveRecord("resolveSrv", `_mongodb._tcp.${parsed.hosts[0].host}`, DNS_TIMEOUT_MS);
      endpoints = records.map(record => ({ host: record.name, port: record.port }));
      report("SRV_LOOKUP", `PASS (${records.length} records)`);
      endpoints.forEach((endpoint, index) => {
        report(`SRV_${index + 1}`, `${safeEndpointHost(endpoint.host)}:${endpoint.port}`);
      });
    } catch (error) {
      report("SRV_LOOKUP", "FAIL");
      report("CATEGORY", error.code === "DIAGNOSTIC_TIMEOUT" ? "srv-lookup-timeout" : `srv-lookup-${safeMongoDiagnostic(error).category}`);
      report("CODE", /^[A-Za-z0-9_-]{1,40}$/.test(error.code || "") ? error.code : "UNKNOWN");
      process.exitCode = 1;
      return;
    }
  } else {
    endpoints = parsed.hosts;
  }

  try {
    const resolved = await Promise.all(endpoints.map(async endpoint => ({ ...endpoint, addresses: await resolveHost(endpoint.host, DNS_TIMEOUT_MS) })));
    endpoints = resolved;
    report("HOST_DNS", "PASS");
    endpoints.forEach((endpoint, index) => {
      report(`HOST_${index + 1}`, `${safeEndpointHost(endpoint.host)}:${endpoint.port}`);
      report(`HOST_${index + 1}_ADDRESS_COUNT`, endpoint.addresses.length);
    });
  } catch (error) {
    report("HOST_DNS", "FAIL");
    report("CATEGORY", error.code === "DIAGNOSTIC_TIMEOUT" ? "dns-timeout" : `dns-${safeMongoDiagnostic(error).category}`);
    report("CODE", /^[A-Za-z0-9_-]{1,40}$/.test(error.code || "") ? error.code : "UNKNOWN");
    process.exitCode = 1;
    return;
  }

  const tcpResults = await Promise.all(endpoints.map(endpoint => tcpProbe(endpoint.host, endpoint.port)));
  const tcpOpen = tcpResults.some(result => result.ok);
  report("TCP_REACHABILITY", tcpOpen ? "PASS" : "FAIL");
  tcpResults.forEach((result, index) => {
    report(`TCP_${index + 1}`, result.ok ? "PASS" : `FAIL (${result.code || "UNKNOWN"})`);
  });
  if (!tcpOpen) {
    const code = tcpResults.find(result => result.code)?.code || "UNKNOWN";
    report("CATEGORY", code === "ETIMEDOUT" ? "network-timeout (network path or Atlas IP allowlist)" : "network-error");
    report("CODE", /^[A-Za-z0-9_-]{1,40}$/.test(code) ? code : "UNKNOWN");
    process.exitCode = 1;
    return;
  }

  const tlsResults = await Promise.all(endpoints.map(endpoint => tlsProbe(endpoint.host, endpoint.port)));
  const tlsOpen = tlsResults.some(result => result.ok);
  report("TLS_HANDSHAKE", tlsOpen ? "PASS" : "FAIL");
  tlsResults.forEach((result, index) => {
    report(`TLS_${index + 1}`, result.ok ? "PASS" : `FAIL (${result.code || "UNKNOWN"})`);
  });

  const client = new MongoClient(uri, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS
  });
  try {
    await client.connect();
    report("MONGODB_CONNECT", "PASS");
    report("CATEGORY", "connected");
  } catch (error) {
    const diagnostic = safeMongoDiagnostic(error);
    report("MONGODB_CONNECT", "FAIL");
    report("CATEGORY", diagnostic.category);
    report("CODE", diagnostic.code);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
}

main().catch(error => {
  const diagnostic = safeMongoDiagnostic(error);
  report("MONGODB_CONNECT", "FAIL");
  report("CATEGORY", diagnostic.category);
  report("CODE", diagnostic.code);
  process.exitCode = 1;
});
