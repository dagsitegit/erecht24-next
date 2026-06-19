# Beispiel: eRecht24 in Next.js (App Router)

Minimaler Ausschnitt, der `@dagsite/erecht24-next` nutzt:

- `app/impressum/page.tsx` + `app/datenschutz/page.tsx` - Seiten mit `<LegalText>` (ISR-Fallback 24h).
- `app/api/erecht24/push/route.ts` - Push-Webhook via `createErecht24PushRoute()`.
- `.env.example` - benötigte Server-Env-Variablen.

Ablauf:

1. `pnpm add @dagsite/erecht24-next`
2. `.env.local` aus `.env.example` befüllen (`ERECHT24_API_KEY`, `ERECHT24_PLUGIN_KEY`).
3. Deployen, dann Push-Client registrieren (siehe Haupt-README), Secret als `ERECHT24_PUSH_SECRET` setzen, neu deployen.
4. In eRecht24 "Push testen" - die Seite aktualisiert sich.
