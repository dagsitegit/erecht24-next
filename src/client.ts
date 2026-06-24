import "server-only"
import type {
  CreateClientInput,
  ERecht24Client,
  LegalText,
  LegalTextType,
} from "./types"
import {
  decodeClient,
  encodeClientInput,
  legalTextTag,
  parseJsonBody,
} from "./util"

export { ERECHT24_TAG_PREFIX, legalTextTag } from "./util"

const API_BASE = "https://api.e-recht24.de/v2"

function getApiKey(): string {
  const key = process.env.ERECHT24_API_KEY
  if (!key) throw new Error("ERECHT24_API_KEY is not set")
  return key
}

// Plugin-Identifier von @dagsite/erecht24-next. Das ist KEIN Geheimnis: eRecht24
// erkennt darüber das Plugin, und jeder Nutzer des Pakets verwendet denselben
// Key (so wie bei allen eRecht24-Plugins). Über ERECHT24_PLUGIN_KEY
// überschreibbar, falls jemand eine eigene Integration mit eigenem Key betreibt.
const DEFAULT_PLUGIN_KEY =
  "MwusKrxNEPxHNTUuKQiwYv5vJQdwhfwbSCVo3DFChPvZNcwHsiiVHRpCX3X9nFSv"

function getPluginKey(): string {
  return process.env.ERECHT24_PLUGIN_KEY || DEFAULT_PLUGIN_KEY
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "eRecht24-api-key": getApiKey(),
    "eRecht24-plugin-key": getPluginKey(),
  }
}

type RequestInitWithNext = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] }
}

async function request<T>(
  path: string,
  init: RequestInitWithNext = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    // Auth-Header zuletzt mergen, damit Aufrufer sie nicht überschreiben können.
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...authHeaders(),
    },
  })
  const body = await res.text()
  if (!res.ok) {
    throw new Error(
      `eRecht24 ${init.method ?? "GET"} ${path} failed: ${res.status} ${body.slice(0, 200)}`,
    )
  }
  // Leerer Body (204 bei DELETE/testPush) -> undefined; ungültiges JSON -> klarer Fehler.
  return parseJsonBody<T>(body) as T
}

const PATHS: Record<LegalTextType, string> = {
  imprint: "/imprint",
  privacyPolicy: "/privacyPolicy",
  privacyPolicySocialMedia: "/privacyPolicySocialMedia",
}

/**
 * Rechtstext abrufen. Die Antwort wird im Next.js-Data-Cache mit Tag gehalten
 * (TTL via `revalidate`, Default 24h) - so invalidiert ein Push (revalidateTag)
 * den Text überall, wo er gerendert wird (auch z.B. im Footer), nicht nur auf
 * einer Route.
 */
export async function getLegalText(
  type: LegalTextType,
  opts: { revalidate?: number } = {},
): Promise<LegalText> {
  const text = await request<LegalText | undefined>(PATHS[type], {
    method: "GET",
    next: { revalidate: opts.revalidate ?? 86400, tags: [legalTextTag(type)] },
  })
  if (!text || typeof text.html_de !== "string") {
    throw new Error(`eRecht24 ${type}: unerwartete Antwort (html_de fehlt)`)
  }
  return text
}

/** Register a push client (webhook) for this project. */
export async function createClient(
  input: CreateClientInput,
): Promise<ERecht24Client> {
  const raw = await request<Record<string, unknown>>("/clients", {
    method: "POST",
    body: JSON.stringify(encodeClientInput(input)),
  })
  return decodeClient(raw ?? {})
}

/** List the push clients registered for this project (max 3 per project). */
export async function listClients(): Promise<ERecht24Client[]> {
  // no-store: Management-Reads nie cachen (auf Next 14 wäre ein GET sonst per
  // Default force-cache -> stale Client-Liste).
  const raw = await request<unknown>("/clients", {
    method: "GET",
    cache: "no-store",
  })
  return Array.isArray(raw) ? raw.map((c) => decodeClient(c)) : []
}

/** Delete a push client by id. */
export async function deleteClient(id: number): Promise<void> {
  await request<unknown>(`/clients/${id}`, { method: "DELETE" })
}

/** Ask eRecht24 to send a test push to the registered webhook. */
export async function triggerTestPush(id: number): Promise<void> {
  await request<unknown>(`/clients/${id}/testPush`, {
    method: "POST",
    body: JSON.stringify({ type: "ping" }),
  })
}
