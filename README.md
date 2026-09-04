# Newsletter Tool

Desktop-orientierter Next.js Newsletter-Editor. Der Stack verwendet Next.js 16.2.9 mit React 19.2.7, entsprechend `next@latest`/`react@latest` zum Zeitpunkt der Aktualisierung. JSON ist die editierbare Quelle; vollständiges E-Mail-HTML wird serverseitig per MJML exportiert.

## Architektur

- `app/`: App Router Pages und API Route Handler für Login, Newsletter, Assets, nutzerbezogene Einstellungen und Export.
- `components/`: dreispaltiger Editor mit Side-Rail, Canvas, Einfügeflächen, Overlay und Inspector.
- `lib/newsletter/`: Zod-Schemas, Defaults, Operationen, Zustand Store und Undo/Redo. Die Modul-Registry in `lib/newsletter/module-registry.ts` sammelt neue Modul-Metadaten inkrementell; aktuell sind `quote` und `sectionHeading` registriert. Neue Module sollen dort künftig Label-Key, Default-Erzeugung und Schema-Referenz ergänzen; serverseitige E-Mail-Renderer werden separat über `email/module-render-registry.ts` angebunden, bevor Canvas-/Inspector-Registries nachgezogen werden.
- `email/`: zentrale E-Mail-Theme-Werte und MJML-Modulrenderer. `theme.css` ist die menschlich lesbare Referenz; `theme.ts` enthält dieselben Token für die Pipeline.
- `lib/db/`: Drizzle Schema für Mandanten, Benutzerrollen, tenantbezogene Fachdaten, Auditereignisse, Magic Links und Sessions.
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

Der ausschließlich lokale Entwicklungsseed legt automatisch `admin@example.test` als Plattform-Admin und `local@example.test` als Mitarbeiter des Entwicklungsmandanten an. Beide Adressen melden sich über `/login` per Magic Link an; die Nachrichten erscheinen in Mailpit. Die Adressen können über `DEV_ADMIN_EMAIL` beziehungsweise `DEV_SEED_EMAIL` in `.env.example` angepasst werden.

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

### Production-/Portainer-Betrieb

1. DNS vorbereiten, z. B. `newsletter.example.com` für die App und `assets.example.com` für öffentlich erreichbare Newsletter-Bilder.
2. `.env.production.example` als Vorlage verwenden und die Werte in Portainer als Stack-Environment-Variablen oder lokal in einer nicht committeten `.env.production` pflegen. Die Production-Compose-Datei nutzt keine Beispiel-Env-Datei als Fallback mehr.
3. Zwingend setzen: die festen Namen für Infrastrukturprojekt, internes Netzwerk und externe Daten-Volumes sowie `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `APP_URL=https://newsletter.example.com`, ein zufälliges `AUTH_RATE_LIMIT_SECRET`, `PUBLIC_ASSET_BASE_URL=https://assets.example.com/newsletter-assets`, echte SMTP-Daten und MinIO/S3-Zugangsdaten. Für die komfortable Erstinstallation zusätzlich `BOOTSTRAP_ADMIN_EMAIL` und `BOOTSTRAP_ADMIN_NAME` setzen. Fehlende Pflichtwerte brechen den Compose-Start bewusst ab.
4. Die leere Infrastruktur ausschließlich bei einer echten Erstinstallation bewusst initialisieren:

```bash
./scripts/init-production-infrastructure.sh \
  --env-file .env.production \
  --create-empty-data-volumes

./scripts/deploy-production.sh \
  --env-file .env.production \
  --backup-dir /mnt/offsite-backups/newsletter-alpha
```

   Bei einer bestehenden Installation müssen stattdessen zuerst die bisherigen Volume-Namen übernommen werden. Das Initialisierungsskript erzeugt ohne die ausdrückliche Option niemals leere Daten-Volumes.
5. Reverse Proxy / Portainer so konfigurieren, dass HTTPS auf den internen Web-Service `web:3000` zeigt. PostgreSQL und die MinIO-Admin-Konsole sollen nicht öffentlich exposed werden. In Portainer werden Infrastruktur und Anwendung als getrennte Stacks betrieben; beide verwenden das konfigurierte externe Netzwerk.
6. MinIO/Asset-Auslieferung so konfigurieren, dass `PUBLIC_ASSET_BASE_URL` von externen Mailclients erreichbar ist. Lokale oder private URLs funktionieren in exportierten Newslettern außerhalb des Servers nicht zuverlässig.
7. Das Deployment-Skript erstellt zwingend ein validiertes PostgreSQL-/MinIO-Backup, führt Migration und Bootstrap als einmalige Jobs aus und ersetzt ausschließlich die kurzlebigen Anwendungscontainer. Danach den Magic-Link für `BOOTSTRAP_ADMIN_EMAIL` anfordern.
8. Smoke-Test durchführen: Magic-Link anfordern, Newsletter erstellen, Bild hochladen, Export herunterladen und prüfen, ob alle Bild-URLs per HTTPS erreichbar sind.

Der Export blockiert in Production lokale/private Bild-URLs sowie nicht per HTTPS erreichbare Bildquellen.

Die vollständige Anleitung für die Übernahme bestehender Volumes, tägliche Backups, reguläre Deployments, geordnetes Stoppen/Starten und eine geprüfte Wiederherstellung steht in [`docs/production-deployment.md`](docs/production-deployment.md). Auf Alpha- und Production-Systemen dürfen insbesondere `docker compose down -v` und `docker volume prune -a` nicht verwendet werden.

## Datenbank

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Für die Runtime und Docker gibt es zusätzlich den kompatiblen Alias:

```bash
pnpm db:ensure
```

Dieser Befehl führt ausschließlich die versionierten Drizzle-Migrationen aus. Der lokale Docker-Web-Service führt anschließend zusätzlich den idempotenten Entwicklungsseed einschließlich lokalem Test-Admin aus. Der Production-Stack erzeugt ausschließlich den explizit über `BOOTSTRAP_ADMIN_EMAIL` konfigurierten ersten Admin und speichert den Abschluss dauerhaft; spätere Env-Änderungen verändern keine Berechtigungen.

## Umgebungsvariablen

Siehe `.env.example` für lokale Entwicklung und `.env.production.example` für Production. Für Portainer werden die Werte als Stack-Environment-Variablen erwartet; `docker-compose.prod.yml` verwendet keine vorausgefüllte Beispiel-Env-Datei als automatischen Fallback. Serverseitige Umgebungsvariablen werden zentral in `lib/env.ts` validiert: In lokaler Entwicklung greifen sichere Defaults, während `NODE_ENV=production` beim Runtime-Start fehlende Pflichtwerte bewusst blockiert. Für den Login sind `APP_URL`, `AUTH_RATE_LIMIT_SECRET` und SMTP-Variablen relevant. Abgesehen von den ausdrücklich lokalen Seed-Accounts wird der Accountbestand ausschließlich durch Adminanlage und Bootstrap bestimmt, nicht durch eine E-Mail-Allowlist. In Produktion muss `PUBLIC_ASSET_BASE_URL` öffentlich per HTTPS erreichbar sein. Lokale MinIO-URLs (`localhost`, `127.0.0.1` oder private Netze) sind nur für lokale Testexports gedacht und in externen Versandtools nicht erreichbar.

## Tests und Qualität

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Für Pull Requests läuft zusätzlich die GitHub-Actions-Workflow-Datei `.github/workflows/ci.yml`. Der Workflow verwendet Node.js 22 aus dem Docker-Projektkontext und `pnpm@9.4.0` aus `packageManager`, cached den pnpm-Store sowie den Next.js-Build-Cache, installiert mit `pnpm install --frozen-lockfile=false` und blockiert PRs bei fehlgeschlagenem Linting, Typecheck, Unit-Tests oder Build. `NODE_ENV` wird nicht global überschrieben: Next.js baut explizit mit `production`, Vitest und der Entwicklungsserver setzen jeweils ihren korrekten Standardwert. Playwright-E2E läuft als separater Job mit PostgreSQL-Service gegen einen lokalen Production-Build; `maxFailures: 0` stellt sicher, dass alle Tests ausgeführt und alle Fehler berichtet werden.

## Export-Architektur

Pipeline: Newsletter-JSON → Zod-Validierung → Export-Preflight → MJML-Renderer → vollständiges HTML → Download als `.html`. Der Export übernimmt keine Tailwind-Klassen, kein JavaScript und keine Web-App-Komponenten.

Der Export-Preflight verhindert in `NODE_ENV=production`, dass Newsletter mit lokalen, privaten oder nur per HTTP erreichbaren Bild-URLs als HTML-Datei heruntergeladen werden. `PUBLIC_ASSET_BASE_URL` muss deshalb produktiv eine öffentliche HTTPS-Adresse sein, z. B. `https://assets.example.com/newsletter-assets`. Lokale MinIO-URLs wie `http://localhost:9000/...`, interne Docker-Hostnamen wie `http://minio:9000/...` und private IP-Adressen sind nur für lokale Entwicklung geeignet und werden in Production blockiert. Nicht-dekorative Bilder benötigen außerdem weiterhin einen Alternativtext.

## Editor

Header-Logos werden in Vorschau und Export kompakt, zentriert und mit maximal 200 px Breite dargestellt; Export-Renderer müssen sich visuell an der Canvas-Vorschau orientieren. Der Newsletter-Hintergrund ist #f4f1ec. Module mit Newsletter-Hintergrundfarbe erhalten keine eigene Outline oder Rahmenfläche. Shared Module-Style-Tokens in `lib/newsletter/module-styles.ts` sind die verbindliche Quelle für Vorschau- und Export-Abstände/Farben.
Newsletter-Module orientieren sich am Club-Entwurf: Featured Event, Zitat, Abschnittsüberschrift und Event-Raster nutzen Navy-Flächen, rote Overlines/Akzentlinien, Serif-Headlines und kompakte Uppercase-CTAs ausschließlich innerhalb der Newsletter-Module. Bildmodule erlauben Uploads von JPEG, PNG und GIF über den Inspector und skalieren Bilder serverseitig automatisch auf maximal 600 px Breite. Textmodule werden direkt im Newsletter-Canvas mit Tiptap bearbeitet. Die Symbol-Toolbar am ausgewählten Textmodul unterstützt Absatz, H2, H3, Fett, Kursiv, Unterstreichen, schwarze und rote Hervorhebungen sowie nummerierte und unnummerierte Listen. Die rechte Inspector-Seitenleiste bleibt beim Scrollen der Canvas fixiert und scrollt nur ihren eigenen Inhalt. Die linke Hauptnavigation nutzt Material-Design-Icon-SVGs für Übersicht, Medien, Einstellungen, Account und Export. Medien, Einstellungen und Account öffnen im Editor als Overlays; neue Newsletter werden ausschließlich auf der Übersichtsseite erstellt. In der Medienübersicht können pro hochgeladenem Asset ein zentraler Titel und Alternativtext gepflegt werden.

## Konfiguration

Der Bereich `/settings` ist über das Zahnrad in der linken Funktionsleiste erreichbar. Dort werden globale Header-Varianten als hochgeladene Bilder gepflegt. Die aktive Header-Variante wird nicht global gesetzt, sondern pro Newsletter im Header-Inspector ausgewählt. Nicht verwendete Header-Varianten können in den globalen Einstellungen gelöscht werden; verwendete Varianten bleiben geschützt. Der Footer wird als eingeschränkter RichText in `app_settings` gespeichert und im Editor sowie im MJML-Export global angewendet.

## Login und Zugriffsschutz

Die Anwendung nutzt ausschließlich Passwordless Login per Magic Link. Nur bereits manuell angelegte, aktive Accounts aktiver Mandanten erhalten einen Link; die Loginseite legt niemals Benutzer an und antwortet unabhängig vom Accountbestand gleich. Der kryptografisch zufällige Einmal-Token wird nur als SHA-256-Hash gespeichert, läuft nach zehn Minuten ab und wird erst nach einer Bestätigungsseite per POST atomar verbraucht. Dadurch verbrauchen übliche E-Mail-Sicherheitsscanner den Link nicht allein durch einen GET-Abruf. Sessions prüfen bei jedem Request Benutzer- und Mandantenstatus. Newsletter, Assets und Einstellungen gehören dem serverseitig aus der Session abgeleiteten Mandanten. Lokale Testmails landen im Docker-Setup in Mailpit (`http://localhost:8025`).

## Alpha-Administration und Support

In Produktion wird der einzige Plattform-Administrator bevorzugt einmalig über die Deployment-Konfiguration angelegt:

```dotenv
BOOTSTRAP_ADMIN_EMAIL=owner@example.com
BOOTSTRAP_ADMIN_NAME="Installation Owner"
```

Der separate One-shot-Service `bootstrap-admin` führt zuerst Migrationen aus und initialisiert den Admin transaktional. Wiederholungen mit derselben Adresse sind No-ops; eine abweichende Adresse oder ein inkonsistenter Installationszustand bricht den Start ab, ohne Berechtigungen zu verändern. Alternativ bleibt `pnpm admin:bootstrap --email admin@example.com --name "Plattform Admin"` verfügbar. Anschließend fordert der Admin regulär einen Magic Link an und verwaltet Mandanten unter `/admin`. Das Admin-E-Mail-Konto muss wegen seiner Plattformrechte mit MFA geschützt sein. Mitarbeiter werden ohne Passwort und ohne automatischen E-Mail-Versand angelegt. Deaktivierungen widerrufen aktive Sessions, löschen aber keine Daten.

Für eine ausdrücklich bestätigte Wiederherstellung über lokalen Serverzugriff steht `pnpm admin:recover --current-email bisher@example.com --email neu@example.com --name "Installation Owner"` bereit. Der Vorgang reaktiviert nur den vorhandenen Admin, widerruft alle Adminsessions und wird auditiert; der Env-Bootstrap führt niemals eine solche Wiederherstellung aus.

Im lokalen Docker-Setup übernimmt der produktionsgesperrte Entwicklungsseed diesen Schritt automatisch mit `admin@example.test`.

Der Supportmodus speichert den betrachteten Mandanten in der serverseitigen Adminsession. Er zeigt einen permanenten Hinweis, bleibt vollständig lesend und blockiert direkte POST-, PUT-, PATCH- und DELETE-Aufrufe serverseitig mit Auditereignis. Verlassen wird er über den permanenten Banner.

Auditereignisse werden 90 Tage aufbewahrt. `pnpm audit:purge` führt die idempotente Bereinigung aus; der Production-Compose-Stack enthält dafür einen täglich laufenden separaten Service. Ausführliche Betriebsanweisungen stehen in `docs/admin-operations.md`.

## Annahmen und Einschränkungen

- Next.js 16 dynamische Routen verwenden asynchrone `params`; Seiten und Route Handler warten diese daher explizit ab.
- In lokaler Entwicklung bleibt ein Default-User für Seeds/Kompatibilität vorhanden; produktive Zugriffe laufen über Magic-Link-Sessions.
- Header/Footer sind systemdefiniert und gesperrt.
- Tiptap ist als eingeschränkter Rich-Text-Stack installiert; der MVP-Inspector speichert Tiptap-JSON über ein kontrolliertes Textfeld.
