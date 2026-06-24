#!/usr/bin/env node
/**
 * Registriert / verwaltet eRecht24-Push-Clients für dein Next.js-Projekt.
 *
 * Aufruf (kein eigenes package.json-Script nötig):
 *   npx erecht24-register https://<domain>/api/erecht24/push
 *   npx erecht24-register --list
 *   npx erecht24-register --delete <id>
 *
 * Die CLI lädt ENV automatisch aus .env.local im aktuellen Verzeichnis
 * (ab Node 20.12). Auf älteren Versionen Variablen vorher exportieren.
 *
 * ENV:
 *   ERECHT24_API_KEY     (Pflicht)  Projekt-Key aus dem eRecht24-Projektmanager
 *   ERECHT24_PLUGIN_KEY  (optional) Override des eingebauten Plugin-Keys
 *   ERECHT24_PLUGIN_NAME / _CMS / _CMS_VERSION / _AUTHOR_MAIL (optional)
 *
 * Nach erfolgreicher Registrierung wird ERECHT24_PUSH_SECRET automatisch in
 * .env.local geschrieben (abschaltbar mit --no-write).
 *
 * Hinweis: eRecht24 erlaubt max. 3 Clients pro Projekt.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"

const API_BASE = "https://api.e-recht24.de/v2"
const ENV_FILE = ".env.local"

// Plugin-Identifier von @dagsite/erecht24-next (kein Secret, per ENV override-bar).
const DEFAULT_PLUGIN_KEY =
  "MwusKrxNEPxHNTUuKQiwYv5vJQdwhfwbSCVo3DFChPvZNcwHsiiVHRpCX3X9nFSv"

// ENV aus .env.local laden (Node 20.12+). Bereits gesetzte Variablen behalten Vorrang.
if (typeof process.loadEnvFile === "function" && existsSync(ENV_FILE)) {
  try {
    process.loadEnvFile(ENV_FILE)
  } catch {
    // ignorieren - Variablen können auch anders gesetzt sein
  }
}

function headers() {
  const apiKey = process.env.ERECHT24_API_KEY
  if (!apiKey) {
    console.error(
      "ERECHT24_API_KEY ist nicht gesetzt (in .env.local oder via export).",
    )
    process.exit(1)
  }
  const pluginKey = process.env.ERECHT24_PLUGIN_KEY || DEFAULT_PLUGIN_KEY
  return {
    "Content-Type": "application/json",
    "eRecht24-api-key": apiKey,
    "eRecht24-plugin-key": pluginKey,
  }
}

async function api(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), ...headers() },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

function upsertEnv(key, value) {
  let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : ""
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, "m")
  if (re.test(content)) {
    content = content.replace(re, line)
  } else {
    if (content && !content.endsWith("\n")) content += "\n"
    content += line + "\n"
  }
  writeFileSync(ENV_FILE, content)
}

async function listClients() {
  const clients = await api("/clients")
  if (!Array.isArray(clients) || !clients.length) {
    console.log("Keine Clients registriert.")
    return
  }
  console.log("Registrierte Clients:")
  for (const c of clients) {
    const id = c.id ?? c.client_id
    const url = c.push_uri ?? c.pushUri
    const plugin = c.plugin_name ?? c.pluginName
    console.log(`  #${id}  ${url}  (plugin: ${plugin})`)
  }
}

async function deleteClient(id) {
  await api(`/clients/${id}`, { method: "DELETE" })
  console.log(`Client #${id} gelöscht.`)
}

async function register(pushUri, { write = true } = {}) {
  // eRecht24 erwartet snake_case im Body.
  const body = {
    push_uri: pushUri,
    push_method: "POST",
    cms: process.env.ERECHT24_CMS || "Next.js",
    cms_version: process.env.ERECHT24_CMS_VERSION || "15",
    plugin_name: process.env.ERECHT24_PLUGIN_NAME || "dagsite/erecht24-next",
    author_mail: process.env.ERECHT24_AUTHOR_MAIL || "dev@dagsite.com",
  }
  const raw =
    (await api("/clients", { method: "POST", body: JSON.stringify(body) })) ?? {}
  const id = raw.id ?? raw.client_id
  const secret = raw.secret ?? raw.push_secret
  const url = raw.push_uri ?? raw.pushUri ?? pushUri
  console.log("Client registriert:")
  console.log(`  ID:     ${id}`)
  console.log(`  URL:    ${url}`)
  console.log(`  Secret: ${secret}`)
  if (write && secret) {
    upsertEnv("ERECHT24_PUSH_SECRET", secret)
    console.log(`\n-> ERECHT24_PUSH_SECRET in ${ENV_FILE} gespeichert.`)
    console.log(
      "   Für Production denselben Wert in die Server-Env (z.B. Vercel) eintragen.",
    )
  } else {
    console.log("\n-> Als ERECHT24_PUSH_SECRET in die Server-Env eintragen.")
  }
}

async function main() {
  const args = process.argv.slice(2)
  const noWrite = args.includes("--no-write")
  const positional = args.filter((a) => a !== "--no-write")
  if (!positional.length) {
    console.error(
      "Usage:\n  npx erecht24-register <push-url>\n  npx erecht24-register --list\n  npx erecht24-register --delete <id>",
    )
    process.exit(1)
  }
  if (positional[0] === "--list") {
    await listClients()
  } else if (positional[0] === "--delete") {
    const id = Number(positional[1])
    if (!id) throw new Error("--delete benötigt eine numerische Client-ID")
    await deleteClient(id)
  } else {
    const url = positional[0]
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      throw new Error("Ungültige Push-URL")
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Push-URL muss http:// oder https:// sein")
    }
    await register(url, { write: !noWrite })
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
