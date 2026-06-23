# Newsletter Tool

Desktop-orientierter Next.js Newsletter-Editor. JSON ist die editierbare Quelle; vollständiges E-Mail-HTML wird serverseitig per MJML exportiert.

## Architektur
- `app/`: App Router Pages und API Route Handler für Newsletter, Assets und Export.
- `components/`: dreispaltiger Editor mit Side-Rail, Canvas, Einfügeflächen, Overlay und Inspector.
- `lib/newsletter/`: Zod-Schemas, Defaults, Operationen, Zustand Store und Undo/Redo.
- `email/`: zentrale E-Mail-Theme-Werte und MJML-Modulrenderer. `theme.css` ist die menschlich lesbare Referenz; `theme.ts` enthält dieselben Token für die Pipeline.
- `lib/db/`: Drizzle Schema für `users`, `newsletters`, `assets`.

## Start
```bash
pnpm install
pnpm dev
```

## Docker
```bash
docker compose up --build
```
Startet Next.js, PostgreSQL und MinIO. MinIO läuft lokal auf `http://localhost:9000`, Konsole auf `http://localhost:9001`. Der Compose-Stack verwendet die offiziellen Docker-Hub-Images `minio/minio:latest` und `minio/mc:latest`, weil die zuvor eingetragenen datierten `minio/mc`-Tags nicht auf Docker Hub existierten.

Für eine saubere lokale Erstinitialisierung nach Schemaänderungen:
```bash
docker compose up -d db minio createbucket
pnpm db:generate
pnpm db:migrate
pnpm db:seed
docker compose up --build web
```

Wenn Docker alte, nicht mehr gültige Image-Tags gecacht hat, entferne sie mit:
```bash
docker compose down --remove-orphans
docker compose pull minio createbucket
docker compose up --build
```

## Datenbank
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Umgebungsvariablen
Siehe `.env.example`. In Produktion muss `PUBLIC_ASSET_BASE_URL` öffentlich per HTTPS erreichbar sein. Lokale MinIO-URLs (`localhost`, `127.0.0.1` oder private Netze) sind nur für lokale Testexports gedacht und in externen Versandtools nicht erreichbar.

## Tests und Qualität
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Export-Architektur
Pipeline: Newsletter-JSON → Zod-Validierung → MJML-Renderer → vollständiges HTML → Download als `.html`. Der Export übernimmt keine Tailwind-Klassen, kein JavaScript und keine Web-App-Komponenten.

## Annahmen und Einschränkungen
- Ein lokaler Default-User ohne Authentifizierung.
- Header/Footer sind systemdefiniert und gesperrt.
- Settings und Account sind bewusst Platzhalter.
- Tiptap ist als eingeschränkter Rich-Text-Stack installiert; der MVP-Inspector speichert Tiptap-JSON über ein kontrolliertes Textfeld.
