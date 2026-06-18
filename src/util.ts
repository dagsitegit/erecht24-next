import type { CreateClientInput, ERecht24Client } from "./types"

/**
 * Konstant-zeitlicher String-Vergleich. Kein Early-Return bei unterschiedlicher
 * Länge - so wird die Secret-Länge nicht über die Antwortzeit verraten.
 * Annahme: ASCII-Input (eRecht24-Push-Secrets sind Hex), dafür reicht charCodeAt.
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
 * eRecht24 `GET /clients` liefert snake_case zurück - hier in die camelCase-
 * TS-API dekodiert (toleriert auch camelCase, falls die API es mal ändert).
 */
export function decodeClient(raw: Record<string, unknown>): ERecht24Client {
  const str = (v: unknown): string => (v == null ? "" : String(v))
  return {
    id: Number(raw.id ?? raw.client_id ?? 0),
    secret: str(raw.secret ?? raw.push_secret),
    pushUri: str(raw.push_uri ?? raw.pushUri),
    pushMethod: "POST",
    cms: str(raw.cms),
    cmsVersion: str(raw.cms_version ?? raw.cmsVersion),
    pluginName: str(raw.plugin_name ?? raw.pluginName),
    authorMail: str(raw.author_mail ?? raw.authorMail),
    created: raw.created != null ? String(raw.created) : undefined,
    modified: raw.modified != null ? String(raw.modified) : undefined,
  }
}
