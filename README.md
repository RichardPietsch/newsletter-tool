# Newsletter Tool

Desktop-orientierter Next.js Newsletter-Editor. Der Stack verwendet Next.js 16.2.9 mit React 19.2.7, entsprechend `next@latest`/`react@latest` zum Zeitpunkt der Aktualisierung. JSON ist die editierbare Quelle; vollständiges E-Mail-HTML wird serverseitig per MJML exportiert.

## Architektur
- `app/`: App Router Pages und API Route Handler für Newsletter, Assets, globale Einstellungen und Export.
- `components/`: dreispaltiger Editor mit Side-Rail, Canvas, Einfügeflächen, Overlay und Inspector.
- `lib/newsletter/`: Zod-Schemas, Defaults, Operationen, Zustand Store und Undo/Redo.
- `email/`: zentrale E-Mail-Theme-Werte und MJML-Modulrenderer. `theme.css` ist die menschlich lesbare Referenz; `theme.ts` enthält dieselben Token für die Pipeline.
- `lib/db/`: Drizzle Schema für `users`, `newsletters`, `assets` und `app_settings`.

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

### Hinweis zum `createbucket`-Container

`createbucket` ist ein einmaliger Initialisierungscontainer. Es ist korrekt, dass er nach erfolgreicher Ausgabe wie `Bucket created successfully` oder `Access permission ... is set to download` mit Code `0` beendet wird. Er ist kein dauerhaft laufender Dienst. Der Web-Container wartet nur darauf, dass dieser Job erfolgreich abgeschlossen wurde.

Wenn der Bucket bereits existiert, bleibt der Befehl durch `mc mb --ignore-existing` idempotent. Die Kurzform `-p` wird bewusst nicht kombiniert, weil aktuelle `mc`-Versionen `-p` und `--ignore-existing` als zwei Formen derselben Option interpretieren. Falls der Web-Container danach nicht startet, prüfe gezielt die Web-Logs:
```bash
docker compose logs -f web
```

## Datenbank
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Für Docker und schnelle lokale Reparaturen gibt es zusätzlich:
```bash
pnpm db:ensure
```
Dieser Befehl legt die MVP-Tabellen bei Bedarf per `create table if not exists` an und seedet den lokalen Default-User. Der Docker-Web-Service führt ihn vor `pnpm dev` automatisch aus, damit der Button "Neuen Newsletter erstellen" nicht gegen eine leere Datenbank läuft. Das Skript ist bewusst ohne Top-Level-`await` geschrieben, damit es im Docker-Container mit der von `tsx` genutzten CommonJS-Transformation läuft.

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

## Editor
Textmodule werden direkt im Newsletter-Canvas mit Tiptap bearbeitet. Die Toolbar am ausgewählten Textmodul unterstützt Absatz, H2, H3, Fett, Kursiv, Unterstreichen, schwarze und rote Hervorhebungen sowie nummerierte und unnummerierte Listen. Die rechte Inspector-Seitenleiste bleibt beim Scrollen der Canvas fixiert und scrollt nur ihren eigenen Inhalt.

## Konfiguration
Der Bereich `/settings` ist über das Zahnrad in der linken Funktionsleiste erreichbar. Dort werden globale Header-Varianten als hochgeladene Bilder gepflegt. Die aktive Header-Variante wird nicht global gesetzt, sondern pro Newsletter im Header-Inspector ausgewählt. Nicht verwendete Header-Varianten können in den globalen Einstellungen gelöscht werden; verwendete Varianten bleiben geschützt. Der Footer wird als eingeschränkter RichText in `app_settings` gespeichert und im Editor sowie im MJML-Export global angewendet.

## Annahmen und Einschränkungen
- Next.js 16 dynamische Routen verwenden asynchrone `params`; Seiten und Route Handler warten diese daher explizit ab.
- Ein lokaler Default-User ohne Authentifizierung.
- Header/Footer sind systemdefiniert und gesperrt.
- Account ist bewusst ein Platzhalter; Einstellungen sind als globaler Header-/Footer-Bereich umgesetzt.
- Tiptap ist als eingeschränkter Rich-Text-Stack installiert; der MVP-Inspector speichert Tiptap-JSON über ein kontrolliertes Textfeld.
