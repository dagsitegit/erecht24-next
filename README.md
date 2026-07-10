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
- Next.js >= 14, React >= 18.

Einen eigenen Developer-/Plugin-Key brauchst du **nicht** - der Plugin-Identifier ist im Paket eingebaut.

## Installation

```bash
npm install @dagsite/erecht24-next
# oder: pnpm add @dagsite/erecht24-next
# oder: yarn add @dagsite/erecht24-next
# oder: bun add @dagsite/erecht24-next
```

## ENV-Variablen

Du musst nur **einen** Wert setzen - den projektbezogenen API-Key:

```bash
ERECHT24_API_KEY=        # Projekt-Key aus dem eRecht24-Projektmanager (pro Projekt)
```

- `ERECHT24_PLUGIN_KEY` ist **nicht** nötig - der Plugin-Identifier ist im Paket eingebaut. Nur setzen, wenn du eine eigene Integration mit eigenem Developer-Key betreiben willst (Override).
- `ERECHT24_PUSH_SECRET` musst du **nicht** manuell setzen - der `register`-Befehl (unten) erzeugt es und schreibt es automatisch in deine `.env.local`.

Der API-Key gehört ausschließlich in die Server-Env (z.B. `.env.local`, Vercel Project Env), niemals in den Client-Bundle.

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

Sprachversionen: Standard ist Deutsch. Für Englisch `<LegalText type="imprint" lang="en" />`. Liefert eRecht24 keine englische Version, fällt die Komponente automatisch auf Deutsch zurück. Beide Sprachen = einfach zwei `<LegalText>` rendern.

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

Die CLI kommt mit dem Paket - kein eigenes Script nötig. Im Projektverzeichnis (mit `ERECHT24_API_KEY` in `.env.local`):

```bash
npx erecht24-register https://deine-domain.de/api/erecht24/push   # registriert + speichert das Secret
npx erecht24-register --list
npx erecht24-register --delete <id>
```

Das Push-Secret wird automatisch als `ERECHT24_PUSH_SECRET` in `.env.local` geschrieben (`--no-write` schaltet das ab). Für Production denselben Wert zusätzlich in die Server-Env (z.B. Vercel) eintragen und einmal neu deployen. Danach in eRecht24 "Push testen" - die Seite muss sich aktualisieren.

Die CLI lädt `.env.local` automatisch ab Node 20.12. Auf älteren Versionen vorher `export ERECHT24_API_KEY=...`.

## Wie der Sync funktioniert (Cache statt Datenbank)

Klassische CMS-Plugins persistieren die Rechtstexte in einer Datenbank oder Datei und aktualisieren sie über einen "Neu laden"-Button in den Einstellungen. Headless Next.js-Sites haben weder Settings-UI noch eigene Datenbank - diese Rolle übernimmt hier der Framework-Cache:

1. **Persistenz = Next.js Data Cache + ISR.** `getLegalText` holt den Text einmal und legt ihn mit Cache-Tag im Data Cache ab (auf Vercel überlebt dieser auch Deployments; self-hosted liegt er in `.next/cache`). Die Seiten werden statisch ausgeliefert - im Normalbetrieb trifft kein einziger Seitenaufruf die eRecht24-API.
2. **Push = der "Neu laden"-Button, nur automatisch.** Ändert sich ein Text im Projekt-Manager, sendet eRecht24 einen Push an die feste Sync-Route (`/api/erecht24/push`, per `pathByType` konfigurierbar). Der Handler prüft das Secret und invalidiert gezielt Cache-Tag + Route (`revalidateTag` / `revalidatePath`) - der nächste Aufruf rendert mit dem frischen Text. Änderungen sind so binnen Sekunden live statt erst nach Cache-Ablauf.
3. **TTL = Sicherheitsnetz.** Die 24h-Revalidierung ist nur der Fallback, falls ein Push verloren geht - nicht der primäre Update-Weg.

Warum nicht einfach "gar nicht cachen"? Dann würde jeder Seitenaufruf die eRecht24-API treffen: langsamere Seiten, unnötige Last auf der API und ein Ausfall der API würde die Rechtsseiten mitreißen. Mit Cache + Push bleiben die Seiten schnell, die API-Last minimal und bei einer API-Störung bleibt der letzte gültige Text online.

**Manueller Sync** (das Äquivalent zum Settings-Button): einfach die Push-Route selbst aufrufen -

```bash
curl -X POST https://deine-domain.de/api/erecht24/push \
  -H "Content-Type: application/json" \
  -d '{"erecht24_secret":"<ERECHT24_PUSH_SECRET>","erecht24_type":"imprint"}'
```

Der "Push testen"-Button im eRecht24-Projekt-Manager prüft die Erreichbarkeit der Route (Ping/Pong).

## Gut zu wissen

- **Server-seitig**: Das Paket nutzt einen `server-only`-Guard, damit die API-Keys nie in den Client-Bundle gelangen. In Server Components / Route Handlers importieren, nicht in `"use client"`-Dateien. Typen mit `import type { ... }` einbinden.
- **CLI lädt `.env.local` automatisch** ab Node 20.12 (`process.loadEnvFile`). Auf älteren Node-Versionen die Variablen vorher exportieren. Die Laufzeit-Teile (Pull/Push) laufen auf jeder Next.js-tauglichen Node-Version.
- **Max. 3 Push-Clients pro Projekt** (z.B. Production + Preview + Staging).
- **snake_case**: `POST /clients` erwartet `push_uri`, `push_method`, `cms`, `cms_version`, `plugin_name`, `author_mail` (die CLI erledigt das). Die Read-Endpunkte liefern dagegen `html_de`, `html_en`, `modified`.
- **Sicherheit**: Das HTML stammt aus der eRecht24-API (vertrauenswürdige Quelle) und wird via `dangerouslySetInnerHTML` gerendert - hier ausschließlich Inhalte der offiziellen API einspeisen. Für Defense-in-Depth kannst du die Ausgabe zusätzlich durch einen HTML-Sanitizer schicken. Das Push-Secret wird konstant-zeitlich verglichen (ohne Prefix-Leak).
- **Cache/Aktualisierung**: Der Text wird im Next.js-Data-Cache mit Tag gehalten (Default-TTL 24h). Ein Push invalidiert den Tag und damit den Text **überall**, wo er gerendert wird (auch im Footer), plus die jeweilige Route.
- **Abmahnschutz**: Die Texte werden unverändert ausgeliefert; Wortlaut und Inhalt kommen 1:1 aus eRecht24.

## API

- `getLegalText(type)`, `createClient`, `listClients`, `deleteClient`, `triggerTestPush`, `legalTextTag(type)`
- `createErecht24PushRoute(options?)`
- `<LegalText type lang? fallback? className? />`
- Typen: `LegalTextType`, `ERecht24Client`, `CreateClientInput`, `PushPayload`

## Beispiel

Ein minimales App-Router-Beispiel liegt unter [`examples/nextjs`](./examples/nextjs).

## Lizenz

MIT (c) DagSite
