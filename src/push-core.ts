import { legalTextTag, timingSafeEqual } from "./util"
import type { LegalTextType, PushPayload } from "./types"

/** Pure decision for an incoming push (no Next.js imports -> unit-testable). */
export type PushDecision =
  | { action: "respond"; status: number; body: { code: number; message: string } }
  | { action: "revalidate"; type: LegalTextType; tag: string; path: string }

/**
 * Validate an incoming push payload and decide what to do. Pure function:
 * no framework or env access, so the security-critical logic (secret check,
 * type validation) is fully testable.
 */
export function decidePush(
  payload: unknown,
  expectedSecret: string,
  pathByType: Record<LegalTextType, string>,
): PushDecision {
  const p = (payload ?? {}) as Partial<PushPayload>
  const secret = typeof p.erecht24_secret === "string" ? p.erecht24_secret : ""
  const type = typeof p.erecht24_type === "string" ? p.erecht24_type : ""

  if (!secret || !type) {
    return {
      action: "respond",
      status: 422,
      body: { code: 422, message: "Missing required fields" },
    }
  }

  if (!timingSafeEqual(secret, expectedSecret)) {
    return {
      action: "respond",
      status: 401,
      body: { code: 401, message: "Invalid secret" },
    }
  }

  if (type === "ping") {
    return { action: "respond", status: 200, body: { code: 200, message: "pong" } }
  }

  // Object.hasOwn statt rohem Lookup: verhindert, dass geerbte Properties
  // ("constructor", "__proto__", "toString") die Typ-Validierung umgehen.
  if (!Object.hasOwn(pathByType, type)) {
    return {
      action: "respond",
      status: 422,
      body: { code: 422, message: `Invalid type: ${type}` },
    }
  }

  const t = type as LegalTextType
  return { action: "revalidate", type: t, tag: legalTextTag(t), path: pathByType[t] }
}
