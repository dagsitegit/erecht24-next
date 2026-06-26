import type { ReactNode } from "react"
import { getLegalText } from "./client"
import type { LegalTextType } from "./types"

export interface LegalTextProps {
  /** Which legal text to render. */
  type: LegalTextType
  /**
   * Sprachversion. Default "de". Liefert eRecht24 die gewünschte Sprache nicht
   * (z.B. `html_en` ist null), wird ohne Fehler auf Deutsch zurückgefallen.
   */
  lang?: "de" | "en"
  /**
   * Optional fallback for fetch failures.
   *
   * IMPORTANT: for legally required pages (Impressum, Datenschutz) do NOT set
   * this. If the fetch fails and no fallback is given, the error propagates so
   * Next.js keeps serving the last successfully rendered page (ISR
   * stale-on-error) instead of caching a placeholder where the legal text
   * should be. Only use `fallback` for non-critical content.
   */
  fallback?: ReactNode
  /** Class applied to the wrapper around the eRecht24 HTML. Style your own prose here. */
  className?: string
}

/**
 * Headless server component: fetches the eRecht24 legal text and renders the
 * delivered HTML. Design-neutral on purpose - wrap it in your own layout
 * (nav, footer, container) and style the `.className` wrapper.
 *
 * The eRecht24 HTML already contains its own <h1> (e.g. "Impressum"), so do NOT
 * add a separate page title around it - that would create a duplicate H1.
 *
 * Security: the HTML originates from eRecht24 (the trusted legal-text provider)
 * and is injected via dangerouslySetInnerHTML. Only render content from the
 * official eRecht24 API here. If you want defense-in-depth, wrap the output in
 * your own HTML sanitizer.
 */
async function fetchHtml(type: LegalTextType, lang: "de" | "en"): Promise<string> {
  const text = await getLegalText(type)

  if (lang === "de") return text.html_de
  if (text.html_en !== null) return text.html_en

  console.warn(`[erecht24] ${type}: html_en nicht verfügbar, Fallback auf html_de`)

  return text.html_de
}

export async function LegalText({
  type,
  lang = "de",
  fallback,
  className,
}: LegalTextProps) {
  try {
    const html = await fetchHtml(type, lang)

    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  } catch (err) {
    if (fallback === undefined) {
      throw err
    }
    console.warn(
      `[erecht24] ${type} unavailable:`,
      err instanceof Error ? err.message : String(err),
    )
    return <>{fallback}</>
  }
}
