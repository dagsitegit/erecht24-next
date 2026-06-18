import "server-only"
import type {
  CreateClientInput,
  ERecht24Client,
  LegalText,
  LegalTextType,
} from "./types"

const API_BASE = "https://api.e-recht24.de/v2"

/** Prefix used for Next.js cache tags, one tag per legal text type. */
export const ERECHT24_TAG_PREFIX = "erecht24"

/** Cache tag for a given legal text type (e.g. "erecht24:imprint"). */
export function legalTextTag(type: LegalTextType): string {
  return `${ERECHT24_TAG_PREFIX}:${type}`
}

function getApiKey(): string {
  const key = process.env.ERECHT24_API_KEY
  if (!key) throw new Error("ERECHT24_API_KEY is not set")
  return key
}

function getPluginKey(): string {
  const key = process.env.ERECHT24_PLUGIN_KEY
  if (!key) throw new Error("ERECHT24_PLUGIN_KEY is not set")
  return key
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "eRecht24-api-key": getApiKey(),
    "eRecht24-plugin-key": getPluginKey(),
  }
}

type RequestInitWithNext = RequestInit & {
  next?: { revalidate?: number; tags?: string[] }
}

async function request<T>(
  path: string,
  init: RequestInitWithNext = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `eRecht24 ${init.method ?? "GET"} ${path} failed: ${res.status} ${body}`,
    )
  }
  return (await res.json()) as T
}

const PATHS: Record<LegalTextType, string> = {
  imprint: "/imprint",
  privacyPolicy: "/privacyPolicy",
  privacyPolicySocialMedia: "/privacyPolicySocialMedia",
}

/** Pull a legal text. Tagged for on-demand revalidation via the push route. */
export async function getLegalText(type: LegalTextType): Promise<LegalText> {
  return request<LegalText>(PATHS[type], {
    method: "GET",
    next: { tags: [legalTextTag(type)] },
  })
}

/** Register a push client (webhook) for this project. */
export async function createClient(
  input: CreateClientInput,
): Promise<ERecht24Client> {
  return request<ERecht24Client>("/clients", {
    method: "POST",
    body: JSON.stringify({ pushMethod: "POST", ...input }),
  })
}

/** List the push clients registered for this project (max 3 per project). */
export async function listClients(): Promise<ERecht24Client[]> {
  return request<ERecht24Client[]>("/clients", { method: "GET" })
}

/** Delete a push client by id. */
export async function deleteClient(id: number): Promise<void> {
  await request<unknown>(`/clients/${id}`, { method: "DELETE" })
}

/** Ask eRecht24 to send a test push to the registered webhook. */
export async function triggerTestPush(id: number): Promise<void> {
  await request<unknown>(`/clients/${id}/testPush`, { method: "POST" })
}
