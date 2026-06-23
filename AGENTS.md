# Newsletter Tool Agent Guide

## Architektur
- Single Next.js App Router Anwendung; Newsletter-JSON ist die einzige editierbare Quelle.
- Export-HTML wird ausschließlich serverseitig über `email/render-newsletter.ts` und MJML erzeugt.
- Datenzugriff liegt in `lib/db`; fachliche Newsletter-Typen, Defaults und Operationen in `lib/newsletter`.

## Qualität
- TypeScript strikt halten; keine `try/catch` Blöcke um Imports.
- Keine frei editierbaren Farben, CSS-Regeln oder HTML-Eingaben im Editor zulassen.
- Header/Footer sind gesperrt und dürfen nicht gelöscht oder verschoben werden.

## Tests
- Standardbefehle: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, optional `pnpm test:e2e`.

## E-Mail Rendering
- Export darf keine Tailwind-Klassen, Web-App-Komponenten oder JavaScript enthalten.
- Bilder brauchen absolute URLs; in Produktion sind localhost/private URLs unzulässig.
- Alt-Text ist Pflicht, sofern ein Bild nicht dekorativ ist.
