import { createErecht24PushRoute } from "@dagsite/erecht24-next"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = createErecht24PushRoute()
