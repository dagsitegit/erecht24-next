import type { ReactNode } from "react"
import { getLegalText } from "./client"
import type { LegalTextType } from "./types"

export interface LegalTextProps {
  /** Which legal text to render. */
  type: LegalTextType
  /** Rendered when the text cannot be loaded (e.g. API unreachable). Default: null. */
  fallback?: ReactNode
  /** Class applied to the wrapper around the eRecht24 HTML. Style your own prose here. */
  className?: string
}

/**
 * Headless server component: fetches the eRecht24 legal text and renders the
 * delivered HTML. Design-neutral on purpose - wrap it in your own layout
 * (nav, footer, container) and style the `.className` wrapper.
 *
 * Note: the eRecht24 HTML already contains its own <h1> (e.g. "Impressum"),
 * so do NOT add a separate page title around it - that would create a
 * duplicate H1 (SEO/a11y issue).
 *
 * Security: the HTML originates from eRecht24 (the trusted legal-text provider)
 * and is injected via dangerouslySetInnerHTML. Only render content from the
 * official eRecht24 API here.
 */
export async function LegalText({
  type,
  fallback = null,
  className,
}: LegalTextProps) {
  let html: string | null = null
  try {
    const text = await getLegalText(type)
    html = text.html_de
  } catch (err) {
    console.warn(`[erecht24] ${type} unavailable:`, (err as Error).message)
  }

  if (!html) return <>{fallback}</>

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
