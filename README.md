# @dagsite/erecht24-next

Auto-Sync der eRecht24-Rechtstexte (Impressum, Datenschutz, Datenschutz Social Media) für **Next.js (App Router)** - per Pull + Push-Webhook. Änderungen in eRecht24 sind binnen Sekunden auf der Website live, ohne manuelles Kopieren und ohne Redeploy.

> Inoffizielle Integration. Entwickelt und gepflegt von [DagSite](https://dagsite.com). eRecht24 ist nicht der Autor dieses Pakets und leistet dafür keinen Support.

## Was es kann

- **Pull**: Impressum, Datenschutz und Datenschutz Social Media als HTML abrufen (Next.js-Caching mit eigenem Tag pro Texttyp).
- **Push**: fertiger Webhook-Handler, der das eRecht24-Secret prüft und die betroffene Seite gezielt revalidiert.
- **Headless-Komponente** `<LegalText>`: rendert das gelieferte HTML, design-neutral - du bettest es in dein eigenes Layout ein und stylst es selbst.
- **CLI** zum Registrieren, Auflisten und Löschen der Push-Clients.

## Voraussetzungen

- eRecht24-**Premium** mit gepflegten Texten im Projektmanager (liefert den **API-Key** pro Projekt).
- Ein eRecht24-**Developer-/Plugin-Key** (über die Nutzungsvereinbarung mit eRecht24).
- Next.js >= 14, React >= 18.

## Installation

```bash
pnpm add @dagsite/erecht24-next
```

## ENV-Variablen (pro Projekt)

```bash
ERECHT24_API_KEY=        # Projekt-Key aus dem eRecht24-Projektmanager
ERECHT24_PLUGIN_KEY=     # Developer-Key (ein Key für alle deine Integrationen)
ERECHT24_PUSH_SECRET=    # wird nach dem Registrieren des Push-Clients gesetzt
```

Keys gehören ausschließlich in die Server-Env (z.B. `.env.local`, Vercel Project Env), niemals in den Client-Bundle oder ins Repo.

## Verwendung

### 1) Seiten

```tsx
// app/impressum/page.tsx
import { LegalText } from "@dagsite/erecht24-next"
import "@dagsite/erecht24-next/legal-text.css"

export const revalidate = 86400 // 24h-Fallback; der Push aktualisiert sofort
export const metadata = {
  title: "Impressum",
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <main>
      <LegalText type="imprint" className="erecht24-prose" />
    </main>
  )
}
```

Hinweis: Das von eRecht24 gelieferte HTML enthält **bereits eine eigene `<h1>`** - setze keine zweite Überschrift drumherum (sonst doppelte H1, schlecht für SEO/Barrierefreiheit).

Hinweis (Ausfallsicherheit): Für Pflicht-Seiten (Impressum, Datenschutz) **kein `fallback` setzen**. Schlägt der Abruf fehl, propagiert der Fehler - Next.js behält per ISR die zuletzt erfolgreich gerenderte Seite, statt einen Platzhalter zu cachen. `fallback` nur für unkritische Inhalte verwenden.

### 2) Push-Webhook

```ts
// app/api/erecht24/push/route.ts
import { createErecht24PushRoute } from "@dagsite/erecht24-next"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = createErecht24PushRoute()
// Optional eigene Pfade:
// export const POST = createErecht24PushRoute({
//   pathByType: { imprint: "/impressum", privacyPolicy: "/datenschutz" },
// })
```

### 3) Push-Client registrieren

In die `package.json`:

```json
{
  "scripts": {
    "erecht24:register": "node --env-file=.env.local node_modules/@dagsite/erecht24-next/bin/erecht24-register.mjs"
  }
}
```

```bash
pnpm erecht24:register https://deine-domain.de/api/erecht24/push   # gibt das Secret aus
pnpm erecht24:register --list
pnpm erecht24:register --delete <id>
```

Das ausgegebene Secret als `ERECHT24_PUSH_SECRET` in die Server-Env eintragen und einmal neu deployen. Danach in eRecht24 "Push testen" - die Seite muss sich aktualisieren.

## Gut zu wissen

- **Max. 3 Push-Clients pro Projekt** (z.B. Production + Preview + Staging).
- **snake_case**: `POST /clients` erwartet `push_uri`, `push_method`, `plugin_name`, `cms_version`, `author_mail` (die CLI erledigt das). Die Read-Endpunkte liefern dagegen `html_de`, `html_en`, `modified`.
- **Sicherheit**: Das HTML stammt aus der eRecht24-API (vertrauenswürdige Quelle) und wird via `dangerouslySetInnerHTML` gerendert - hier ausschließlich Inhalte der offiziellen API einspeisen. Für Defense-in-Depth kannst du die Ausgabe zusätzlich durch einen HTML-Sanitizer schicken. Das Push-Secret wird konstant-zeitlich verglichen (ohne Längen-Leak).
- **Cache/Aktualisierung**: Der Text wird im Next.js-Data-Cache mit Tag gehalten (Default-TTL 24h). Ein Push invalidiert den Tag und damit den Text **überall**, wo er gerendert wird (auch im Footer), plus die jeweilige Route.
- **Abmahnschutz**: Die Texte werden unverändert ausgeliefert; Wortlaut und Inhalt kommen 1:1 aus eRecht24.

## API

- `getLegalText(type)`, `createClient`, `listClients`, `deleteClient`, `triggerTestPush`, `legalTextTag(type)`
- `createErecht24PushRoute(options?)`
- `<LegalText type fallback? className? />`
- Typen: `LegalTextData`, `LegalTextType`, `ERecht24Client`, `CreateClientInput`, `PushPayload`

## Beispiel

Ein minimales App-Router-Beispiel liegt unter [`examples/nextjs`](./examples/nextjs).

## Lizenz

MIT (c) DagSite
