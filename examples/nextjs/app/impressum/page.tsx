import { LegalText } from "@dagsite/erecht24-next"
import "@dagsite/erecht24-next/legal-text.css"

// 24h-ISR-Fallback; der Push-Webhook aktualisiert sofort.
export const revalidate = 86400

export const metadata = {
  title: "Impressum",
  // Impressum muss auffindbar sein (TMG) -> indexierbar.
  robots: { index: true, follow: true },
}

export default function ImpressumPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem" }}>
      {/* Kein fallback bei Pflicht-Seiten: schlägt der Abruf fehl, behält Next.js
          (ISR) die letzte gültige Seite, statt einen Platzhalter zu cachen. */}
      <LegalText type="imprint" className="erecht24-prose" />
    </main>
  )
}
