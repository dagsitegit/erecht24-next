import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { decidePush } from "./push-core"
import type { LegalTextType } from "./types"

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

    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json(
        { code: 400, message: "Invalid JSON" },
        { status: 400 },
      )
    }

    const decision = decidePush(payload, expectedSecret, pathByType)
    if (decision.action === "respond") {
      return NextResponse.json(decision.body, { status: decision.status })
    }

    // Revalidation darf den Push nicht zum 500 machen: bei Fehler trotzdem 200
    // quittieren (sonst könnte eRecht24 den Push-Client deaktivieren), Fehler
    // loggen. Der Data-Cache ist ggf. trotzdem invalidiert.
    try {
      revalidateTag(decision.tag)
      revalidatePath(decision.path)
    } catch (err) {
      console.error(
        `[erecht24] revalidation failed for ${decision.type}:`,
        err instanceof Error ? err.message : String(err),
      )
      return NextResponse.json({
        code: 200,
        message: "received (revalidation deferred)",
        type: decision.type,
        path: decision.path,
      })
    }

    return NextResponse.json({
      code: 200,
      message: "revalidated",
      type: decision.type,
      path: decision.path,
    })
  }
}
