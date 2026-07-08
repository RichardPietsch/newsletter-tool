# Newsletter Tool

Desktop-orientierter Next.js Newsletter-Editor. Der Stack verwendet Next.js 16.2.9 mit React 19.2.7, entsprechend `next@latest`/`react@latest` zum Zeitpunkt der Aktualisierung. JSON ist die editierbare Quelle; vollständiges E-Mail-HTML wird serverseitig per MJML exportiert.

## Architektur
- `app/`: App Router Pages und API Route Handler für Login, Newsletter, Assets, nutzerbezogene Einstellungen und Export.
- `components/`: dreispaltiger Editor mit Side-Rail, Canvas, Einfügeflächen, Overlay und Inspector.
- `lib/newsletter/`: Zod-Schemas, Defaults, Operationen, Zustand Store und Undo/Redo.
- `email/`: zentrale E-Mail-Theme-Werte und MJML-Modulrenderer. `theme.css` ist die menschlich lesbare Referenz; `theme.ts` enthält dieselben Token für die Pipeline.
- `lib/db/`: Drizzle Schema für `users`, `newsletters`, `assets`, `app_settings`, Magic Links und Sessions.
- `lib/auth/`: Passwordless Authentifizierung mit gehashten Einmal-Token, HTTP-only Session-Cookies und Zugriffsschutz für Pages/API-Routen.

## Start
```bash
pnpm install
pnpm dev
```

## Docker
```bash
docker compose up --build
```
Startet Next.js, PostgreSQL, MinIO und Mailpit für lokale Login-E-Mails. MinIO läuft lokal auf `http://localhost:9000`, Konsole auf `http://localhost:9001`. Mailpit ist unter `http://localhost:8025` erreichbar und zeigt lokal versendete Magic-Link-E-Mails an. Der Compose-Stack verwendet die offiziellen Docker-Hub-Images `minio/minio:latest` und `minio/mc:latest`, weil die zuvor eingetragenen datierten `minio/mc`-Tags nicht auf Docker Hub existierten.

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


## Öffentliche Testumgebung / Portainer Deployment

Für eine öffentlich erreichbare Testumgebung darf nicht der lokale Dev-Server verwendet werden. Das `Dockerfile` enthält deshalb ein `development`-Target für lokale Entwicklung und ein `production`-Target, das beim Image-Build `pnpm build` ausführt und anschließend `pnpm start` nutzt.

### Lokale Entwicklung

```bash
docker compose up --build
```

Das lokale Compose-Setup nutzt weiterhin PostgreSQL, MinIO und Mailpit. Mailpit ist nur für lokale Login-Mails gedacht und darf nicht als produktiver SMTP-Dienst verwendet werden.

### Production-/Portainer-Stack

1. DNS vorbereiten, z. B. `newsletter.example.com` für die App und `assets.example.com` für öffentlich erreichbare Newsletter-Bilder.
2. `.env.production.example` kopieren und als Portainer-Env bzw. `.env.production` mit echten Werten pflegen. Keine Beispielwerte unverändert produktiv verwenden.
3. Zwingend setzen: `APP_URL=https://newsletter.example.com`, `PUBLIC_ASSET_BASE_URL=https://assets.example.com/newsletter-assets`, echte SMTP-Daten und entweder `AUTH_ALLOWED_EMAILS` oder `AUTH_ALLOWED_EMAIL_DOMAINS`.
4. Stack mit Production-Compose starten:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

5. Reverse Proxy / Portainer so konfigurieren, dass HTTPS auf den internen Web-Service `web:3000` zeigt. PostgreSQL und die MinIO-Admin-Konsole sollen nicht öffentlich exposed werden.
6. MinIO/Asset-Auslieferung so konfigurieren, dass `PUBLIC_ASSET_BASE_URL` von externen Mailclients erreichbar ist. Lokale oder private URLs funktionieren in exportierten Newslettern außerhalb des Servers nicht zuverlässig.
7. Smoke-Test durchführen: Magic-Link anfordern, Newsletter erstellen, Bild hochladen, Export herunterladen und prüfen, ob alle Bild-URLs per HTTPS erreichbar sind.

Noch offene Härtungsschritte vor einem breiteren Test: CSRF-/Origin-Schutz für mutierende APIs, Export-Validierung gegen lokale/private Bild-URLs und bessere Upload-Fehlerbehandlung.

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
Siehe `.env.example`. Für den Login sind `APP_URL`, `AUTH_ALLOWED_EMAILS` oder `AUTH_ALLOWED_EMAIL_DOMAINS` sowie SMTP-Variablen relevant. In Produktion sollte mindestens eine Auth-Allowlist gesetzt sein; ohne Allowlist ist die Anmeldung nur außerhalb von `NODE_ENV=production` offen. In Produktion muss `PUBLIC_ASSET_BASE_URL` öffentlich per HTTPS erreichbar sein. Lokale MinIO-URLs (`localhost`, `127.0.0.1` oder private Netze) sind nur für lokale Testexports gedacht und in externen Versandtools nicht erreichbar.

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
Header-Logos werden in Vorschau und Export kompakt, zentriert und mit maximal 200 px Breite dargestellt; Export-Renderer müssen sich visuell an der Canvas-Vorschau orientieren. Der Newsletter-Hintergrund ist #f4f1ec. Module mit Newsletter-Hintergrundfarbe erhalten keine eigene Outline oder Rahmenfläche. Shared Module-Style-Tokens in `lib/newsletter/module-styles.ts` sind die verbindliche Quelle für Vorschau- und Export-Abstände/Farben.
Newsletter-Module orientieren sich am Club-Entwurf: Featured Event, Zitat, Abschnittsüberschrift und Event-Raster nutzen Navy-Flächen, rote Overlines/Akzentlinien, Serif-Headlines und kompakte Uppercase-CTAs ausschließlich innerhalb der Newsletter-Module. Bildmodule erlauben Uploads von JPEG, PNG und GIF über den Inspector und skalieren Bilder serverseitig automatisch auf maximal 600 px Breite. Textmodule werden direkt im Newsletter-Canvas mit Tiptap bearbeitet. Die Symbol-Toolbar am ausgewählten Textmodul unterstützt Absatz, H2, H3, Fett, Kursiv, Unterstreichen, schwarze und rote Hervorhebungen sowie nummerierte und unnummerierte Listen. Die rechte Inspector-Seitenleiste bleibt beim Scrollen der Canvas fixiert und scrollt nur ihren eigenen Inhalt. Die linke Hauptnavigation nutzt Material-Design-Icon-SVGs für Übersicht, Medien, Einstellungen, Account und Export. Medien, Einstellungen und Account öffnen im Editor als Overlays; neue Newsletter werden ausschließlich auf der Übersichtsseite erstellt. In der Medienübersicht können pro hochgeladenem Asset ein zentraler Titel und Alternativtext gepflegt werden.

## Konfiguration
Der Bereich `/settings` ist über das Zahnrad in der linken Funktionsleiste erreichbar. Dort werden globale Header-Varianten als hochgeladene Bilder gepflegt. Die aktive Header-Variante wird nicht global gesetzt, sondern pro Newsletter im Header-Inspector ausgewählt. Nicht verwendete Header-Varianten können in den globalen Einstellungen gelöscht werden; verwendete Varianten bleiben geschützt. Der Footer wird als eingeschränkter RichText in `app_settings` gespeichert und im Editor sowie im MJML-Export global angewendet.

## Login und Zugriffsschutz
Die Anwendung nutzt Passwordless Login per Magic Link. Der Login erzeugt einen kryptografisch sicheren Einmal-Token, speichert nur dessen SHA-256-Hash in `auth_magic_links`, versendet den Link per SMTP und setzt nach erfolgreicher Verifikation ein HTTP-only Session-Cookie. Newsletter, Assets und Einstellungen werden über `ownerId` bzw. nutzerbezogene Settings eindeutig dem angemeldeten Nutzer zugeordnet. Lokale Testmails landen im Docker-Setup in Mailpit (`http://localhost:8025`).

## Annahmen und Einschränkungen
- Next.js 16 dynamische Routen verwenden asynchrone `params`; Seiten und Route Handler warten diese daher explizit ab.
- In lokaler Entwicklung bleibt ein Default-User für Seeds/Kompatibilität vorhanden; produktive Zugriffe laufen über Magic-Link-Sessions.
- Header/Footer sind systemdefiniert und gesperrt.
- Tiptap ist als eingeschränkter Rich-Text-Stack installiert; der MVP-Inspector speichert Tiptap-JSON über ein kontrolliertes Textfeld.
