import type { CreateClientInput, ERecht24Client, LegalTextType } from "./types"

/** Prefix used for Next.js cache tags, one tag per legal text type. */
export const ERECHT24_TAG_PREFIX = "erecht24"

/** Cache tag for a given legal text type (e.g. "erecht24:imprint"). */
export function legalTextTag(type: LegalTextType): string {
  return `${ERECHT24_TAG_PREFIX}:${type}`
}

/**
 * Konstant-zeitlicher String-Vergleich ohne Early-Return -> kein Prefix-Leak.
 * Hinweis: am Längen-Übergang bleibt ein vernachlässigbarer Laufzeitunterschied
 * (eine Iteration) gegenüber Netzwerk-Jitter; eRecht24-Push-Secrets sind
 * ASCII-Hex fester Länge, daher unkritisch.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return mismatch === 0
}

/**
 * Body einer erfolgreichen Antwort parsen: leer/whitespace -> undefined
 * (z.B. 204 bei DELETE/testPush); ungültiges JSON -> klarer Fehler statt
 * roher SyntaxError.
 */
export function parseJsonBody<T>(body: string): T | undefined {
  if (!body.trim()) return undefined
  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error("eRecht24: ungültiges JSON im Response-Body")
  }
}

/**
 * eRecht24 `POST /clients` erwartet snake_case. Die öffentliche TS-API nutzt
 * camelCase - hier wird an der Grenze kodiert.
 */
export function encodeClientInput(
  input: CreateClientInput,
): Record<string, string> {
  return {
    push_uri: input.pushUri,
    push_method: input.pushMethod ?? "POST",
    cms: input.cms,
    cms_version: input.cmsVersion,
    plugin_name: input.pluginName,
    author_mail: input.authorMail,
  }
}

/**
 * eRecht24 `GET /clients` liefert snake_case zurück. Die Client-Endpunkte nutzen
 * `created_at`/`updated_at` (anders als die LegalText-Endpunkte mit
 * `created`/`modified`) - hier werden beide Varianten toleriert und in die
 * camelCase-TS-API dekodiert.
 */
export function decodeClient(raw: Record<string, unknown>): ERecht24Client {
  const str = (v: unknown): string => (v == null ? "" : String(v))
  const created = raw.created_at ?? raw.created
  const modified = raw.updated_at ?? raw.modified
  return {
    id: Number(raw.id ?? raw.client_id ?? 0),
    secret: str(raw.secret ?? raw.push_secret),
    pushUri: str(raw.push_uri ?? raw.pushUri),
    pushMethod: "POST",
    cms: str(raw.cms),
    cmsVersion: str(raw.cms_version ?? raw.cmsVersion),
    pluginName: str(raw.plugin_name ?? raw.pluginName),
    authorMail: str(raw.author_mail ?? raw.authorMail),
    created: created != null ? String(created) : undefined,
    modified: modified != null ? String(modified) : undefined,
  }
}
