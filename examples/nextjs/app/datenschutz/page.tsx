import { LegalText } from "@dagsite/erecht24-next"
import "@dagsite/erecht24-next/legal-text.css"

// 24h-ISR-Fallback; der Push-Webhook aktualisiert sofort.
export const revalidate = 86400

export const metadata = {
  title: "Datenschutz",
  robots: { index: false, follow: false },
}

export default function DatenschutzPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <LegalText
        type="privacyPolicy"
        className="erecht24-prose"
        fallback={<p>Inhalt folgt in Kürze.</p>}
      />
    </main>
  )
}
