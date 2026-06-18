import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { legalTextTag } from "./client"
import { timingSafeEqual } from "./util"
import type { LegalTextType, PushPayload } from "./types"

export interface PushRouteOptions {
  /**
   * Map each legal text type to the route path that renders it. Used for
   * revalidatePath() so the rendered page refreshes on a push.
   * Defaults: imprint -> /impressum, privacyPolicy + privacyPolicySocialMedia -> /datenschutz.
   */
  pathByType?: Partial<Record<LegalTextType, string>>
  /** Name of the env var holding the push secret. Default: ERECHT24_PUSH_SECRET. */
  secretEnv?: string
}

const DEFAULT_PATHS: Record<LegalTextType, string> = {
  imprint: "/impressum",
  privacyPolicy: "/datenschutz",
  privacyPolicySocialMedia: "/datenschutz",
}

/**
 * Build the POST handler for the eRecht24 push webhook.
 *
 * Usage in app/api/erecht24/push/route.ts:
 *   export const runtime = "nodejs"
 *   export const dynamic = "force-dynamic"
 *   export const POST = createErecht24PushRoute()
 */
export function createErecht24PushRoute(options: PushRouteOptions = {}) {
  const pathByType: Record<LegalTextType, string> = {
    ...DEFAULT_PATHS,
    ...(options.pathByType ?? {}),
  }
  const secretEnv = options.secretEnv ?? "ERECHT24_PUSH_SECRET"

  return async function POST(req: Request) {
    const expectedSecret = process.env[secretEnv]
    if (!expectedSecret) {
      return NextResponse.json(
        { code: 500, message: "Push secret not configured" },
        { status: 500 },
      )
    }

    let payload: PushPayload
    try {
      payload = (await req.json()) as PushPayload
    } catch {
      return NextResponse.json(
        { code: 400, message: "Invalid JSON" },
        { status: 400 },
      )
    }

    const secret = typeof payload?.erecht24_secret === "string" ? payload.erecht24_secret : ""
    const type = payload?.erecht24_type
    if (!secret || !type) {
      return NextResponse.json(
        { code: 422, message: "Missing required fields" },
        { status: 422 },
      )
    }

    if (!timingSafeEqual(secret, expectedSecret)) {
      return NextResponse.json(
        { code: 401, message: "Invalid secret" },
        { status: 401 },
      )
    }

    if (type === "ping") {
      return NextResponse.json({ code: 200, message: "pong" })
    }

    const path = pathByType[type as LegalTextType]
    if (!path) {
      return NextResponse.json(
        { code: 422, message: `Invalid type: ${type}` },
        { status: 422 },
      )
    }

    // Revalidation darf den Push nicht zum 500 machen: bei einem Fehler trotzdem
    // 200 quittieren (sonst könnte eRecht24 den Push-Client deaktivieren), aber
    // den Fehler loggen. Der Data-Cache ist ggf. trotzdem invalidiert.
    try {
      revalidateTag(legalTextTag(type as LegalTextType))
      revalidatePath(path)
    } catch (err) {
      console.error(
        `[erecht24] revalidation failed for ${type}:`,
        err instanceof Error ? err.message : String(err),
      )
      return NextResponse.json({
        code: 200,
        message: "received (revalidation deferred)",
        type,
        path,
      })
    }

    return NextResponse.json({ code: 200, message: "revalidated", type, path })
  }
}
