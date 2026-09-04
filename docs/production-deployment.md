# Sicherer Betrieb und Deployment

## Sicherheitsmodell

Die Production-Umgebung besteht aus zwei unabhängig verwalteten Compose-Projekten:

- `docker-compose.infra.yml` betreibt PostgreSQL und MinIO. Beide verwenden feste, externe Docker-Volumes.
- `docker-compose.prod.yml` betreibt nur kurzlebige Anwendungsdienste: Migration, Admin-Bootstrap, Bucket-Initialisierung, Web-Anwendung und Audit-Bereinigung.

Ein Anwendungsupdate ersetzt daher keine Datenbank- oder Storage-Container. Die Produktionsskripte verwenden weder `docker compose down` noch einen Prune-Befehl. Externe Volumes werden bei einem versehentlichen `docker compose down -v` nicht durch Compose entfernt. Sie sind dennoch kein Backup: Ein explizites `docker volume prune -a` kann auch ungenutzte benannte Volumes löschen.

Die beiden zu sichernden Bestandteile sind:

1. PostgreSQL: Mandanten, Accounts, Newsletter, Einstellungen, Events und Asset-Metadaten.
2. MinIO: die eigentlichen hochgeladenen Bilddateien.

## Verbotene Betriebsbefehle

Auf Alpha- und Production-Servern dürfen diese Befehle nicht verwendet werden:

```bash
docker compose down -v
docker compose down --volumes
docker volume prune -a
docker system prune --volumes
```

Auch wenn `docker system prune --volumes` derzeit nur ungenutzte anonyme Volumes entfernt, gehört ein globales Pruning nicht in einen Deployment-Ablauf. Images und Build-Cache können bei Bedarf gezielt und erst nach einem erfolgreichen Deployment bereinigt werden.

## Konfiguration

Die Production-Konfiguration wird einmalig aus der Vorlage erzeugt:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Diese Werte identifizieren die persistenten Ressourcen und müssen über alle Deployments unverändert bleiben:

```dotenv
NEWSLETTER_INFRA_PROJECT=newsletter-alpha-infra
NEWSLETTER_APP_PROJECT=newsletter-alpha-app
NEWSLETTER_INTERNAL_NETWORK=newsletter-alpha-internal
POSTGRES_DATA_VOLUME=newsletter-alpha-postgres-data
MINIO_DATA_VOLUME=newsletter-alpha-minio-data
```

Die standardmäßig nur lokal gebundenen Ports können bei Bedarf ebenfalls festgelegt werden:

```dotenv
WEB_BIND_ADDRESS=127.0.0.1
WEB_PORT=3000
MINIO_BIND_ADDRESS=127.0.0.1
MINIO_PORT=9000
```

Der Datenbank-Hostname in `DATABASE_URL` bleibt `db`; der interne S3-Endpunkt bleibt `http://minio:9000`. Beide Namen werden über das gemeinsame externe Netzwerk aufgelöst.

Das Backupziel muss außerhalb des Git-Checkouts und im echten Betrieb außerhalb des Servers liegen, beispielsweise auf einem eingehängten Backup-Speicher:

```text
/mnt/offsite-backups/newsletter-alpha
```

Das Verzeichnis muss vor dem ersten Backup bewusst angelegt beziehungsweise eingehängt werden. Die Skripte erzeugen ein fehlendes Backupverzeichnis absichtlich nicht, damit ein ausgefallener Offsite-Mount nicht unbemerkt durch ein lokales Verzeichnis ersetzt wird.

## Einmalige Übernahme einer bestehenden Installation

Dieser Abschnitt ist wichtig, wenn bereits Daten in Volumes des bisherigen kombinierten Compose-Stacks liegen. Vor dem Aktualisieren des Codes zunächst die tatsächlichen Volume-Namen feststellen:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker volume ls
```

Noch genauer lassen sich die am bisherigen PostgreSQL- und MinIO-Container eingehängten Volumes ausgeben:

```bash
docker inspect "$(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q db)" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}'

docker inspect "$(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q minio)" \
  --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}'
```

Diese beiden Namen als `POSTGRES_DATA_VOLUME` und `MINIO_DATA_VOLUME` in `.env.production` eintragen. Sie dürfen bei einer bestehenden Installation nicht durch neue Namen ersetzt werden.

Vor der Umstellung ein Server-/Provider-Snapshot und mindestens ein PostgreSQL-Dump anlegen. Anschließend den bisherigen Stack nur stoppen, nicht entfernen:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop -t 30 web audit-cleanup
docker compose --env-file .env.production -f docker-compose.prod.yml stop -t 60 minio db
```

Danach den neuen Code abrufen und die vorhandenen Volumes in die getrennte Infrastruktur übernehmen:

```bash
git pull --ff-only
./scripts/init-production-infrastructure.sh --env-file .env.production
./scripts/deploy-production.sh \
  --env-file .env.production \
  --backup-dir /mnt/offsite-backups/newsletter-alpha
```

Der Build aktualisiert standardmäßig auch die Basisimages aus der Registry. Falls die Registry nach einem erfolgreichen Backup vorübergehend nicht erreichbar ist und das benötigte Basisimage nachweislich bereits lokal vorliegt, kann der Build bewusst ohne Aktualisierung wiederholt werden:

```bash
./scripts/deploy-production.sh \
  --env-file .env.production \
  --backup-dir /mnt/offsite-backups/newsletter-alpha \
  --use-local-base-image
```

Wenn CI oder eine Registry bereits ein geprüftes `APP_IMAGE` bereitstellt, kann der Server-Build vollständig entfallen. Das konfigurierte Image muss vorher mit `docker pull <APP_IMAGE>` geladen worden sein:

```bash
./scripts/deploy-production.sh \
  --env-file .env.production \
  --backup-dir /mnt/offsite-backups/newsletter-alpha \
  --use-prebuilt-image
```

Das Initialisierungsskript verweigert den Start, wenn eines der konfigurierten Daten-Volumes fehlt. Außerdem verhindert es, dass ein bereits laufender alter PostgreSQL- oder MinIO-Container und der neue Infrastruktur-Container gleichzeitig dasselbe Volume verwenden.

Erst nach erfolgreichem Login-, Newsletter- und Bildtest dürfen die gestoppten Container des alten Stacks gezielt entfernt werden. Die Volumes bleiben bestehen.

## Bewusste leere Erstinstallation

Nur bei einer tatsächlich neuen, leeren Installation dürfen die Daten-Volumes erzeugt werden:

```bash
./scripts/init-production-infrastructure.sh \
  --env-file .env.production \
  --create-empty-data-volumes

./scripts/deploy-production.sh \
  --env-file .env.production \
  --backup-dir /mnt/offsite-backups/newsletter-alpha
```

Die ausdrückliche Option verhindert, dass ein Tippfehler im Volume-Namen unbemerkt als scheinbar leere Anwendung startet.

## Reguläres Deployment

Ein normales Deployment benötigt keinen vollständigen Stopp. PostgreSQL, MinIO und die bisherige Web-Anwendung laufen während Backup, Build und Migration weiter. Erst für den Austausch des Web-Containers sendet Compose ein reguläres Stoppsignal und wartet bis zu 30 Sekunden auf ein geordnetes Beenden.

```bash
cd /pfad/zum/newsletter-tool
git fetch origin
git status --short
git pull --ff-only

./scripts/deploy-production.sh \
  --env-file .env.production \
  --backup-dir /mnt/offsite-backups/newsletter-alpha
```

Der Ablauf ist fest vorgegeben:

1. Beide Compose-Dateien und alle Pflichtvariablen validieren.
2. Gesundheit von PostgreSQL und MinIO prüfen.
3. Ein verpflichtendes und validiertes Backup von Datenbank und Bildern erstellen.
4. Das neue Production-Image bauen, seinen Next.js-Production-Build vor jeder Migration validieren und das bisher laufende Image als Rollback-Tag behalten.
5. Bucket-Initialisierung, versionierte Migrationen und Admin-Bootstrap als einmalige Jobs ausführen.
6. Nur `web` und `audit-cleanup` neu erstellen.
7. Auf den Healthcheck der Loginseite warten.
8. Bei einem fehlgeschlagenen Healthcheck automatisch das vorherige Anwendungs-Image wieder einsetzen.

Das Deployment-Skript schreibt den aktuellen Git-Commit als Build-ID in das lokal erzeugte Image. In der Plattform-Administration erscheint dadurch im Footer die Anwendungs-Version zusammen mit einem Link zum exakten Commit und einem direkten Vergleich mit dem aktuellen Stand des `main`-Branches auf GitHub. Die fachliche Versionsnummer wird vor einem Release im Feld `version` der `package.json` erhöht.

Extern erzeugte Images müssen dieselbe Build-Angabe beim Erstellen erhalten, damit der Footer auch bei `--use-prebuilt-image` den korrekten Commit anzeigt:

```bash
docker build \
  --target production \
  --build-arg APP_BUILD_SHA="$(git rev-parse --short=12 HEAD)" \
  --tag registry.example.com/newsletter-tool:0.1.0 .
```

Migrationen müssen deshalb nach dem Expand-/Contract-Prinzip mindestens ein Release rückwärtskompatibel bleiben. Ein Image-Rollback macht eine bereits erfolgreich ausgeführte Datenbankmigration nicht rückgängig.

## Backups

Ein manuelles Backup wird ohne Anwendungsunterbrechung erstellt:

```bash
./scripts/backup-production.sh \
  --env-file .env.production \
  --backup-dir /mnt/offsite-backups/newsletter-alpha
```

Jedes Backup erhält einen UTC-Zeitstempel und enthält:

- `database.dump`: PostgreSQL-Archiv im Custom-Format.
- `assets.tar.gz`: Spiegel des konfigurierten MinIO-Buckets.
- `MANIFEST.txt`: Zeitpunkt, Git-Revision, Volume-Namen und Anzahl gesicherter Mandanten-Designs.
- `SHA256SUMS`: Prüfsummen aller Backup-Artefakte.

Das Skript validiert das PostgreSQL-Archiv, das Asset-Archiv und alle Prüfsummen, bevor das Backup atomar unter seinem endgültigen Namen erscheint. Es löscht bewusst keine alten Backups. Aufbewahrung, Verschlüsselung, Zugriffsschutz und Offsite-Replikation müssen vom Backup-Speicher gesteuert werden. Empfohlen sind mindestens ein tägliches Backup, ein zusätzliches Backup vor jedem Deployment und regelmäßige Wiederherstellungstests.

Das Mandanten-Design wird vollständig und versioniert in `app_settings.settings` gespeichert: Standard-Header, Light- und Dark-Mode-Farben sowie der Standard-Footer bilden gemeinsam ein Dokument. Der Migrationslauf ergänzt fehlende Datensätze und führt ältere Dokumentformen einmalig in dieses Format über. Bereits aktuelle Dokumente werden dabei nicht aktualisiert; normale Lesezugriffe schreiben ebenfalls niemals Einstellungen zurück. Das Backup prüft ausdrücklich, dass die Tabellendaten von `app_settings` im PostgreSQL-Archiv enthalten sind, und dokumentiert die Anzahl vollständiger Design-Datensätze als `tenant_design_complete_rows` im Manifest.

Beispiel für einen täglichen Cron-Eintrag um 02:15 Uhr:

```cron
15 2 * * * cd /pfad/zum/newsletter-tool && ./scripts/backup-production.sh --env-file .env.production --backup-dir /mnt/offsite-backups/newsletter-alpha >> /var/log/newsletter-backup.log 2>&1
```

## Sicheres Stoppen und Starten

Für Wartung an Reverse Proxy oder Anwendung nur die kurzlebigen App-Container stoppen:

```bash
./scripts/stop-production.sh --env-file .env.production
```

PostgreSQL und MinIO laufen dabei weiter. Es werden keine Container, Netzwerke oder Volumes gelöscht.

Nur für Serverwartung die gesamte Umgebung herunterfahren. Dafür ist ein frisches Backup verpflichtend:

```bash
./scripts/stop-production.sh \
  --env-file .env.production \
  --include-infrastructure \
  --backup-dir /mnt/offsite-backups/newsletter-alpha
```

Die Reihenfolge ist Web/Audit → MinIO → PostgreSQL. Alle Dienste erhalten zuerst ein reguläres Stoppsignal und ausreichend Zeit für ein geordnetes Herunterfahren. Der Audit-Worker reicht das Stoppsignal an seinen gerade laufenden Bereinigungs- oder Warteprozess weiter; Production-Container benötigen beim Start keinen Zugriff auf die npm-Registry. Gestartet wird in umgekehrter fachlicher Reihenfolge:

```bash
./scripts/start-production.sh --env-file .env.production
```

Das Startskript verweigert den Start bei fehlenden Volumes oder fehlendem Netzwerk, startet und prüft zuerst die Infrastruktur, führt anschließend idempotente Initialisierungen und Migrationen aus und startet zuletzt die Anwendung.

## Wiederherstellung

Eine Wiederherstellung überschreibt den aktuellen Datenbankinhalt. Sie benötigt deshalb eine explizite Bestätigungsphrase und erstellt vorher automatisch ein weiteres Sicherheitsbackup:

```bash
./scripts/restore-production.sh \
  --env-file .env.production \
  --backup /mnt/offsite-backups/newsletter-alpha/20260904T021500Z \
  --safety-backup-dir /mnt/offsite-backups/newsletter-alpha \
  --confirm RESTORE-NEWSLETTER-DATA
```

Vor dem Überschreiben werden Prüfsummen und Archive validiert. Danach stoppt das Skript die Anwendung, stellt PostgreSQL wieder her, kopiert die Bilddateien zurück, führt die aktuellen Migrationen aus und startet die Anwendung erst nach erfolgreichem Healthcheck.

Neuere, im Backup nicht vorhandene MinIO-Objekte werden absichtlich nicht gelöscht. Dadurch bleibt eine Wiederherstellung im Zweifel datenbewahrend; nicht mehr referenzierte Dateien können später kontrolliert bereinigt werden.

## Kontrolle nach Deployment oder Restore

```bash
docker compose \
  --env-file .env.production \
  --project-name newsletter-alpha-infra \
  --file docker-compose.infra.yml \
  ps

docker compose \
  --env-file .env.production \
  --project-name newsletter-alpha-app \
  --file docker-compose.prod.yml \
  ps

docker compose \
  --env-file .env.production \
  --project-name newsletter-alpha-app \
  --file docker-compose.prod.yml \
  logs --tail 100 web
```

Zusätzlich manuell prüfen:

1. Login per Magic Link.
2. Vorhandene Mandanten und Newsletter.
3. Vorschau eines vorhandenen Bildes.
4. Upload eines Testbildes.
5. Newsletter-Export mit öffentlich erreichbaren HTTPS-Bild-URLs.
