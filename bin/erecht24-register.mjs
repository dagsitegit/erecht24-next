#!/usr/bin/env node
/**
 * Registriert / verwaltet Push-Clients bei eRecht24 für dieses Projekt.
 *
 * Aufruf (ENV via --env-file laden, Node-nativ, kein tsx nötig):
 *   node --env-file=.env.local node_modules/@dagsite/erecht24-next/bin/erecht24-register.mjs <push-url>
 *   node --env-file=.env.local ... --list
 *   node --env-file=.env.local ... --delete <id>
 *
 * Praktischer ist ein package.json-Script, z.B.:
 *   "erecht24:register": "node --env-file=.env.local node_modules/@dagsite/erecht24-next/bin/erecht24-register.mjs"
 *
 * ENV:
 *   ERECHT24_API_KEY       (Pflicht)  Projekt-Key aus dem eRecht24-Projektmanager
 *   ERECHT24_PLUGIN_KEY    (Pflicht)  Developer-Key
 *   ERECHT24_PLUGIN_NAME   (optional) Default: dagsite/erecht24-next
 *   ERECHT24_CMS           (optional) Default: Next.js
 *   ERECHT24_CMS_VERSION   (optional) Default: 15
 *   ERECHT24_AUTHOR_MAIL   (optional) Default: dev@dagsite.com
 *
 * Hinweis: eRecht24 erlaubt max. 3 Clients pro Projekt.
 */

const API_BASE = "https://api.e-recht24.de/v2"

function headers() {
  const apiKey = process.env.ERECHT24_API_KEY
  const pluginKey = process.env.ERECHT24_PLUGIN_KEY
  if (!apiKey) {
    console.error("ERECHT24_API_KEY is not set")
    process.exit(1)
  }
  if (!pluginKey) {
    console.error("ERECHT24_PLUGIN_KEY is not set")
    process.exit(1)
  }
  return {
    "Content-Type": "application/json",
    "eRecht24-api-key": apiKey,
    "eRecht24-plugin-key": pluginKey,
  }
}

async function api(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

async function listClients() {
  const clients = await api("/clients")
  if (!clients || !clients.length) {
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

async function register(pushUri) {
  // eRecht24 erwartet snake_case im Body.
  const body = {
    push_uri: pushUri,
    push_method: "POST",
    cms: process.env.ERECHT24_CMS || "Next.js",
    cms_version: process.env.ERECHT24_CMS_VERSION || "15",
    plugin_name: process.env.ERECHT24_PLUGIN_NAME || "dagsite/erecht24-next",
    author_mail: process.env.ERECHT24_AUTHOR_MAIL || "dev@dagsite.com",
  }
  const raw = await api("/clients", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const id = raw.id ?? raw.client_id
  const secret = raw.secret ?? raw.push_secret
  const url = raw.push_uri ?? raw.pushUri ?? pushUri
  console.log("Client registriert:")
  console.log(`  ID:     ${id}`)
  console.log(`  URL:    ${url}`)
  console.log(`  Secret: ${secret}`)
  console.log("")
  console.log("-> Als ERECHT24_PUSH_SECRET in die Projekt-Env-Vars eintragen.")
}

async function main() {
  const args = process.argv.slice(2)
  if (!args.length) {
    console.error(
      "Usage:\n  ... <push-url>\n  ... --list\n  ... --delete <id>",
    )
    process.exit(1)
  }
  try {
    if (args[0] === "--list") {
      await listClients()
    } else if (args[0] === "--delete") {
      const id = Number(args[1])
      if (!id) throw new Error("--delete benötigt eine numerische Client-ID")
      await deleteClient(id)
    } else {
      const url = args[0]
      let parsed
      try {
        parsed = new URL(url)
      } catch {
        throw new Error("Ungültige Push-URL")
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Push-URL muss http:// oder https:// sein")
      }
      await register(url)
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
