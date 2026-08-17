# Mandantenfähige Alpha-Administration: Analyse und Implementierungsplan

Status: freigegeben und umgesetzt  
Stand: 15. August 2026

## 1. Ergebnis der Bestandsanalyse

Die Anwendung ist eine einzelne Next.js-App-Router-Anwendung mit direktem Drizzle-Zugriff auf PostgreSQL. Newsletter-JSON ist die fachliche Quelle; der HTML-Export läuft ausschließlich serverseitig über MJML. Der aktuelle Stand ist benutzerbezogen, nicht mandantenbezogen.

### Authentifizierung und Sitzungen

- Der Login erfolgt passwortlos per Magic Link (`lib/auth/magic-link.ts`).
- Eine erlaubte, noch unbekannte E-Mail-Adresse erzeugt beim Anfordern eines Magic Links automatisch einen Benutzer. Das ist für den geschlossenen Alpha-Test als öffentliche Registrierung ungeeignet.
- Magic-Link- und Session-Token werden nur als SHA-256-Hash gespeichert. Das Session-Cookie ist HTTP-only, in Produktion `secure`, `sameSite=lax` und besitzt eine absolute Laufzeit.
- Die Magic-Link-Anforderung hat persistente, datenbankgestützte Limits pro E-Mail und IP. Ein fehlgeschlagener Login wird jedoch nicht als fachliches Audit-Ereignis gespeichert.
- Eine Sessionvalidierung prüft heute nur Token, Ablauf und Widerruf. Benutzer- oder Mandantenstatus existieren noch nicht und können deshalb nicht bei jedem Request berücksichtigt werden.
- Es gibt keine Rollen und keinen Plattform-Administrator.
- `/logout` verändert den Sitzungszustand derzeit über GET.

### PostgreSQL-Datenmodell

Vorhanden sind `users`, `newsletters`, `assets`, `app_settings`, `auth_magic_links`, `sessions` und ein sehr kleines `audit_events`.

- `newsletters.owner_id`, `assets.owner_id` und `app_settings.owner_id` trennen Daten pro Benutzer.
- `audit_events` enthält nur Benutzer, Typ, optionale Entity-ID und Zeitstempel. Fehlgeschlagene Logins, Schweregrad, Ergebnis, Mandant, Zusammenfassung, Korrelation und Metadaten sind nicht abbildbar.
- Es gibt ein Drizzle-Schema, aber noch keine versionierten SQL-Migrationen. `scripts/ensure-db.ts` erzeugt bzw. erweitert Tabellen ad hoc beim Start.
- Der lokale Seed erzeugt nur `local-user`; die Template-Initialisierung läuft momentan beim ersten Magic-Link-Login pro Benutzer.

### Datenzugriffe und fachlicher Arbeitsstand

Alle fachlichen Zugriffe sind derzeit an die Benutzer-ID gebunden:

| Bereich           | Lesezugriff                                                  | Schreibzugriff                                 | heutige Trennung                                          |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------- |
| Newsletter-Liste  | `app/newsletters/page.tsx`, `GET /api/newsletters`           | `POST /api/newsletters`                        | `owner_id = session.user.id`                              |
| Newsletter-Detail | `app/newsletters/[id]/page.tsx`, `GET /api/newsletters/[id]` | PUT, PATCH, DELETE und Clone auf derselben API | Newsletter-ID plus `owner_id`                             |
| Export            | `GET /api/newsletters/[id]/export`                           | nur Audit-Nebenwirkung                         | Newsletter-ID plus `owner_id`; Einstellungen pro Benutzer |
| Assets            | `GET /api/assets`                                            | POST-Upload, PUT-Metadaten                     | `owner_id`                                                |
| Einstellungen     | `/settings`, `GET /api/settings`                             | `PUT /api/settings`                            | `owner_id`; Datensatz-ID ist Benutzer-ID                  |
| Beispieldaten     | YAML und statische Demo-Bilder                               | Seed beim ersten Benutzerlogin                 | Kopie pro Benutzer, nicht idempotent                      |

Es gibt keine Server Actions. Autosave ruft `PUT /api/newsletters/[id]` auf. Es gibt keine Queue, keinen Worker und keinen Scheduler. Dateiuploads gehen über S3/MinIO; die Objekt-Keys haben noch kein Mandantenpräfix. Bilder müssen wegen des E-Mail-Exports öffentlich erreichbar sein, die Editor-Metadaten müssen dennoch tenant-isoliert bleiben.

### Logging und Fehler

- Der strukturierte Konsolenlogger entfernt Felder mit sensitiven Schlüsseln und gibt bei `Error` nur den Namen aus.
- Datenbank-Audits sind best effort: Ein Auditfehler blockiert die fachliche Operation nicht.
- Es gibt keine Admin-Logansicht, keine 90-Tage-Bereinigung und keine persistente Erfassung relevanter Anwendungsfehler.
- Korrelations-IDs werden schon aus `x-request-id` übernommen oder erzeugt, aber noch nicht im Auditmodell gespeichert oder längenbegrenzt.

### Qualität und Betrieb

- CI führt Lint, Typecheck, Unit-Tests, Build und Playwright gegen PostgreSQL aus.
- Lokal konnten die Befehle in der Planphase nicht gestartet werden, weil `node_modules` fehlt und Netzwerkzugriff auf die npm-Registry in der Sandbox nicht verfügbar war. Das ist kein festgestellter Fehler der Testsuite.
- Produktion startet aktuell mit `pnpm db:ensure`; dieser Mechanismus ist für nachvollziehbare Alpha-Migrationen nicht ausreichend.

## 2. Zielmodell und getroffene Architekturentscheidungen

### 2.1 Benutzer und Mandantenzugehörigkeit

Die bestehende `users`-Tabelle bleibt die Account-Tabelle. Die genau eine Mandantenzugehörigkeit eines Mitarbeiters wird direkt als `users.tenant_id` modelliert; eine zusätzliche Membership-Tabelle würde bei ausschließlich 1:1-Zugehörigkeit unnötige Zustände erlauben.

Vorgesehene Regeln:

- Rolle `platform_admin`: `tenant_id IS NULL`.
- Rolle `tenant_member`: `tenant_id IS NOT NULL`.
- Ein Check-Constraint erzwingt diese Kombination.
- Ein partieller Unique-Index auf die Admin-Rolle erlaubt höchstens einen Plattform-Administrator.
- Die Anwendung verweigert den operativen Start für Adminfunktionen, solange der Bootstrap noch keinen Admin erzeugt hat. „Mindestens ein Admin“ lässt sich mit einem einfachen zeilenlokalen Constraint nicht sicher erzwingen; der dokumentierte Bootstrap und ein Betriebscheck schließen diese Lücke.
- E-Mail-Adressen bleiben systemweit und case-insensitiv eindeutig.
- Benutzer und Mandanten werden ausschließlich aktiviert/deaktiviert, nicht gelöscht.

### 2.2 Passwortlose Magic-Link-Authentifizierung

Der vorhandene Magic-Link-Login bleibt als einziger Authentifizierungsweg erhalten. Es gibt keine parallele Passwortauthentifizierung und folglich keine Passwort-Hashes, initialen Passwörter oder erzwungenen Passwortwechsel. Die ursprüngliche Passwortanforderung ist durch diese geprüfte Produktentscheidung ersetzt.

- Die Magic-Link-Anforderung darf niemals einen Benutzer anlegen. Ein Link wird nur für einen bereits manuell angelegten, aktiven Account versendet; bei Mitarbeitern muss zusätzlich der Mandant aktiv sein.
- Die öffentliche Antwort ist für unbekannte, deaktivierte und aktive Accounts identisch und wird mit möglichst ähnlichem Antwortverhalten ausgeliefert, damit der Accountbestand nicht ermittelt werden kann.
- Tokens werden kryptografisch zufällig mit mindestens 256 Bit Entropie erzeugt, ausschließlich als SHA-256-Hash gespeichert, nur einmal akzeptiert und verfallen nach höchstens zehn Minuten.
- Der GET-Aufruf aus der E-Mail verbraucht das Token noch nicht, sondern zeigt eine minimale Bestätigungsseite. Erst ein origin-geprüfter POST verbraucht es atomar und erstellt die Session. Dadurch können übliche E-Mail-Sicherheitsscanner den Link nicht allein durch Abruf ungültig machen.
- Bestätigungsseite und Antwort setzen `Referrer-Policy: no-referrer` sowie `Cache-Control: no-store`. Nach erfolgreichem Verbrauch folgt sofort eine Weiterleitung auf eine tokenfreie URL. Token und vollständige Query-Strings werden nie protokolliert.
- Datenbankgestützte, atomare Limits gelten für Anforderungen pro HMAC-gehashter, normalisierter E-Mail-Adresse und pro vertrauenswürdig ermittelter Client-IP sowie für fehlgeschlagene Verifikationen. Der Reverse Proxy muss eingehende Forwarding-Header überschreiben.
- Benutzer- und Mandantenstatus werden vor dem Versand, beim Einlösen und bei jeder späteren Sessionvalidierung geprüft. Deaktivierung widerruft zusätzlich vorhandene Sitzungen in derselben Transaktion.
- Beim erfolgreichen Login werden letzter Login, letzte Mandantenaktivität und Audit atomar aktualisiert. Unbekannte, abgelaufene, bereits verbrauchte oder für inaktive Accounts ausgestellte Links erzeugen ein bereinigtes fehlgeschlagenes Loginereignis ohne E-Mail-Adresse oder Token.
- Das Cookie wird HTTP-only, in Produktion `secure`, `sameSite=strict`, pfadgebunden und mit kurzer absoluter sowie serverseitiger Inaktivitätsgrenze betrieben.
- Da E-Mail der einzige Authentifizierungsfaktor ist, muss insbesondere das Postfach des Plattform-Administrators mit MFA geschützt sein. Diese betriebliche Voraussetzung wird dokumentiert.

### 2.3 Autorisierungskontexte

Ein zentraler serverseitiger Auth-Kontext ersetzt direkte Verwendung von `user.id`:

- `requireAdminContext()` erlaubt ausschließlich den aktiven Plattform-Administrator.
- `requireTenantReadContext()` liefert für Mitarbeiter deren serverseitige `tenant_id`; für den Admin nur den in der Session aktivierten Supportmandanten.
- `requireTenantWriteContext()` erlaubt nur aktive Mitarbeiter aktiver Mandanten und blockiert jeden Supportkontext.
- Der Client sendet für normale fachliche Zugriffe keine `tenant_id`. Ressourcen-IDs werden stets gemeinsam mit der Tenant-ID aus dem Auth-Kontext abgefragt.
- Fremde, deaktivierte und nicht vorhandene Ressourcen liefern nach außen dieselbe 404-Antwort.

Tenantbezogene Repository-Funktionen nehmen einen typisierten Tenantkontext statt einer frei übergebenen Client-ID entgegen. Direkter `db`-Zugriff wird auf diese Servermodule und explizite Adminabfragen begrenzt.

### 2.4 Lesender Supportmodus

Der Supportmodus ist keine Impersonation. Die handelnde Identität bleibt der Administrator.

- `sessions.support_tenant_id` und `support_started_at` speichern den betrachteten Mandanten serverseitig.
- Start und Ende sind Adminoperationen und erzeugen Audit-Ereignisse mit Administrator als Akteur.
- Im Supportmodus leiten Seiten und GET-APIs den Tenant ausschließlich aus der Session ab.
- Ein dauerhaft sichtbarer Banner im Root-Layout nennt den Mandanten und bietet „Supportmodus verlassen“ an.
- Editor, Einstellungen und Übersicht erhalten zusätzlich einen Read-only-Zustand für eine klare UI.
- Jede mutierende fachliche oder administrative Route verwendet zentral `requireTenantWriteContext()` beziehungsweise eine mutationsfähige Admin-Guard. Solange Support aktiv ist, werden alle Mutationen außer „Supportmodus beenden“ und Logout serverseitig mit 403 abgewiesen und als `support.write_blocked` protokolliert.
- Ein Regressionstest inventarisiert mutierende Route Handler, damit neue POST/PUT/PATCH/DELETE-Endpunkte nicht versehentlich ohne Guard hinzukommen.

### 2.5 Row-Level Security

PostgreSQL RLS wird in dieser Phase nicht aktiviert. Die bestehende App nutzt einen gemeinsamen Pool und einzelne, nicht transaktionsgebundene Abfragen. Sichere RLS würde einen transaktionslokalen Tenantparameter für jeden Datenzugriff sowie gesonderte, eng begrenzte Policies für Admin-Support benötigen. Eine globale Pool-Sessionvariable könnte zwischen Requests auslaufen und wäre gefährlicher als die jetzige Lage.

Tenant-Isolation wird daher vollständig in der Anwendung und in Query-Constraints durchgesetzt. RLS bleibt eine spätere zusätzliche Schutzschicht, sobald alle fachlichen Zugriffe über einen transaktionsgebundenen Datenzugriffsadapter laufen; es wird ausdrücklich nicht als Ersatz für Autorisierung eingeplant.

## 3. Geplantes Datenmodell

### `tenants`

- `id` Text/UUID, Primärschlüssel
- `name`, nicht leer
- `status` (`active`, `inactive`)
- `admin_notes`, optional, größenbegrenzt
- `created_at`, `updated_at`, `last_activity_at`
- Indizes auf Status/Name und letzte Aktivität

### `users`

- bestehende ID, Name, normalisierte E-Mail und Zeitstempel
- `tenant_id`, nullable nur für den Plattform-Administrator
- `role` (`platform_admin`, `tenant_member`)
- `status` (`active`, `inactive`)
- `last_login_at`, `created_at`, `updated_at`
- Check-Constraint für Rolle/Tenant, partieller Unique-Index für genau höchstens einen Admin
- Indizes `(tenant_id, status)` und `(tenant_id, last_login_at)`

### Fachliche Tabellen

`newsletters`, `assets` und `app_settings` erhalten eine nicht nullable `tenant_id` mit Foreign Key. `owner_id` entfällt; die Identität des Erstellers gehört bei Bedarf ins Audit, nicht in die Besitzautorisierung.

- Newsletter: Index `(tenant_id, updated_at)`, optionales `seed_key`, Unique `(tenant_id, seed_key)` für nicht-null Seed-Keys.
- Assets: Objekt-Key künftig `<tenant-id>/<zufällige-id>-<bereinigter-name>`, Index `(tenant_id, created_at)`, Unique `(tenant_id, storage_key)`, optionales idempotentes `seed_key`.
- Einstellungen: genau ein Datensatz pro Tenant über Unique/Primary Key auf `tenant_id`.

### `sessions`

Zusätzlich zum gehashten Token:

- `support_tenant_id`, `support_started_at`
- absolute Ablaufzeit, letzter Zugriff, Widerrufszeit
- Indizes nach Benutzer, Ablauf und Supportmandant

Sessions enthalten keine Rolle oder Tenantkopie als Autoritätsquelle; diese Werte werden bei der Validierung aktuell aus `users`/`tenants` gelesen.

### `audit_events`

- `id`, `created_at`, `event_type`, `severity`, `outcome`
- `tenant_id`, nullable nur wenn fachlich nicht ermittelbar
- `actor_user_id`, nullable etwa bei unbekanntem fehlgeschlagenem Login
- serverseitige kurze `summary`
- `correlation_id`
- kleine bereinigte `metadata` als JSONB
- optionale `entity_type`/`entity_id`
- Indizes `(tenant_id, created_at)`, `(tenant_id, event_type, created_at)`, `(severity, created_at)`, `(actor_user_id, created_at)` und Korrelation

Metadaten werden anhand ereignisspezifischer Allow-Lists aufgebaut, rekursiv redigiert, in Tiefe und Stringlänge beschränkt und auf höchstens 4 KiB begrenzt. Passwörter, Tokens, Newsletterdokumente, Header und Stacktraces werden nicht angenommen.

Pflichtereignisse:

- `auth.login_succeeded`, `auth.login_failed`
- `newsletter.created` (Blanko oder bewusster Clone; nie Autosave oder Seed)
- `application.error`
- `tenant.created`, `tenant.deactivated`, `tenant.reactivated`
- `account.created`, `account.deactivated`, `account.reactivated`
- `support.started`, `support.ended`, `support.write_blocked`

Bestehende sinnvolle Ereignisse für Upload, Export, Versandstatus, Löschen und Einstellungen bleiben erhalten und werden auf das neue Format gehoben.

### `auth_rate_limits`

Eine kleine Tabelle speichert atomare Zeitfensterzähler für HMAC-gehashte Login-Kennung und IP. Keine Magic-Link- oder Session-Tokens und keine unnötigen Requestdaten werden gespeichert. Abgelaufene Zähler werden zusammen mit der Auditbereinigung entfernt.

## 4. Migration und Seeds

1. Vor Ausführung wird ein Datenbank-Backup erstellt. Es werden keine MinIO-Objekte gelöscht.
2. Eine versionierte SQL-Migration erzeugt neue Tabellen/Constraints und erweitert bestehende Tabellen zunächst nullable.
3. Ein stabiler Entwicklungsmandant wird angelegt. Bestehende eindeutig kontrollierte Entwicklungsbenutzer und deren `owner_id`-Daten werden diesem Mandanten zugeordnet; nicht eindeutig zuordenbare automatisch erzeugte Accounts werden deaktiviert, bis sie geprüft wurden.
4. `newsletters`, `assets` und `app_settings` werden über den bisherigen Owner auf `tenant_id` zurückgefüllt. Nicht zuordenbare Entwicklungsdaten brechen die Migration ab statt still einem falschen Tenant zugeordnet zu werden.
5. Tenantspalten werden `NOT NULL`, passende Foreign Keys/Indizes/Unique-Constraints werden aktiviert und `owner_id` wird entfernt.
6. Alte Magic Links und Sessions werden kontrolliert verworfen bzw. widerrufen. Die Magic-Link-Tabelle bleibt erhalten, erhält die benötigten Indizes und wird auf den scanner-sicheren zweistufigen Verbrauch umgestellt.
7. `scripts/ensure-db.ts` wird durch `pnpm db:migrate` ersetzt. Production- und Playwright-Startpfade führen Migrationen, aber keine implizite Accountanlage aus.
8. Der lokale Entwicklungsseed legt idempotent Entwicklungsmandant, einen konfigurierbaren Testaccount, einen konfigurierbaren Plattform-Admin und genau eine Tenantkopie des Beispiel-Newsletters an. Er legt weder Passwörter noch Magic Links oder Sessions an und ist in Produktion vollständig gesperrt.
9. Die Tenantanlage ruft direkt nach der transaktionalen Anlage dieselbe idempotente Templateinitialisierung auf. `seed_key`-Constraints verhindern Duplikate auch bei Wiederholung oder Parallelität. Block- und Asset-IDs werden pro Tenantkopie neu erzeugt; die YAML-Ausgangsdatei bleibt unverändert.
10. Ein separater One-shot-Service legt den initialen Administrator optional aus `BOOTSTRAP_ADMIN_EMAIL` und `BOOTSTRAP_ADMIN_NAME` an. Ein persistenter Installationszustand und eine transaktionale PostgreSQL-Advisory-Lock machen den Vorgang einmalig und parallelitätssicher. Derselbe Wert ist bei Wiederholung ein No-op; eine abweichende Adresse verändert keine Berechtigungen. CLI-Bootstrap und ein ausdrücklich bestätigter Recovery-Pfad bleiben für manuelle Installationen und Notfälle erhalten. Kein Pfad erzeugt Magic Link oder Session; der Administrator fordert seinen ersten Magic Link regulär über die Loginseite an.

## 5. Admin-Oberfläche und APIs

### Seiten

- `/admin`: Tenantübersicht mit Status, Erstellung, aktiven Accounts, letztem Mitarbeiterlogin, letzter Aktivität und Fehlerzahl der letzten sieben Tage.
- `/admin/tenants/[id]`: Stammdaten, Status, Accounts, letzter Login, jüngste Aktivität/Fehler und Start des Supportmodus.
- `/admin/logs`: paginierte Filter nach Tenant, Ereignistyp, Schweregrad und Zeitraum.

### Mutationen

- Tenant anlegen/bearbeiten/deaktivieren/reaktivieren.
- Tenantmitglied mit Name und E-Mail anlegen. Dabei wird keine E-Mail versendet; der Mitarbeiter fordert bei Bedarf selbst einen Magic Link über die Loginseite an.
- Account deaktivieren/reaktivieren.
- Supportmodus starten/beenden.

Alle Adminrouten nutzen separate Admin-Guards und Originprüfung. Deaktivierungen erfordern sowohl einen Bestätigungsdialog als auch ein serverseitig geprüftes, zur Ziel-ID passendes Bestätigungsfeld. Statuswechsel und Sessionwiderruf erfolgen transaktional. Ein normaler Benutzer erhält für Adminseiten keine Informationen über deren Inhalt.

## 6. Auditbereinigung und Fehlererfassung

- `pnpm audit:purge` löscht innerhalb einer Transaktion Auditereignisse mit `created_at < now() - interval '90 days'` sowie abgelaufene Authentifizierungs- und Rate-Limit-Datensätze.
- Das Produktions-Compose erhält einen kleinen separaten Cleanup-Service, der dasselbe idempotente Kommando täglich ausführt. Für andere Deployments wird ein äquivalenter täglicher Scheduler dokumentiert.
- Unerwartete Request-Fehler werden zentral über die Next.js-Instrumentierung erfasst. Adminsicht und Audit erhalten nur eine bereinigte Zusammenfassung und Korrelations-ID; der vollständige Fehler bleibt ausschließlich im geschützten Serverlog.
- Auditfehler werden weiterhin sicher im strukturierten Serverlog gemeldet. Sicherheitskritische Ereignisse wie Statusänderungen und Supportstart werden innerhalb derselben Datenbanktransaktion wie die Operation geschrieben; die Operation schlägt fehl, wenn dieses Audit nicht gespeichert werden kann.

## 7. Implementierungsphasen nach Freigabe

### Phase A: Schema, Migration und Auth-Grundlage

- Drizzle-Schema und versionierte Migrationen
- gehärteter Magic-Link-Flow ohne automatische Accountanlage, Rate Limiting und sichere Sessions
- Admin-Bootstrap und Entwicklungsseed
- zentrale Auth-/Rollen-/Tenantkontexte
- Tests für Rollenconstraint, genau eine Mitgliedschaft, Deaktivierung und Sessionwiderruf

Abnahmepunkt: Login und Datenmodell funktionieren, noch ohne breite Admin-UI.

### Phase B: Tenantfähige fachliche Datenzugriffe

- Newsletter, Assets, Einstellungen, Export und Templateinitialisierung auf Tenantkontext umstellen
- S3-Keys mit Tenantpräfix
- idempotente Beispielkopie
- Erstellungs-Audit ausschließlich beim bewussten Start/Clone
- Isolationstests mit zwei Tenants und manipulierten IDs

Abnahmepunkt: Mitarbeiter desselben Tenants teilen Daten; fremde Tenants bleiben für Lesen und Schreiben unsichtbar.

### Phase C: Adminverwaltung und Audit

- Adminübersicht, Tenantdetail, Accountanlage und Statuswechsel
- strukturierte Ereignisse, Fehlerwrapper, Filteransicht
- transaktionale kritische Audits
- Adminautorisierungs- und Reaktivierungstests

Abnahmepunkt: Alpha-Administration ist vollständig serverseitig geschützt.

### Phase D: Supportmodus

- serverseitiger Sessionkontext, Banner, Exit
- UI-Read-only und zentraler Schreibschutz für APIs
- Start/Ende/Blockade protokollieren
- vollständige Support- und Mutationsmatrix testen

Abnahmepunkt: Der Admin kann Tenantdaten lesen; kein direkter oder manipulierter Schreibrequest ist möglich.

### Phase E: Betrieb, Retention und Endprüfung

- tägliche 90-Tage-Bereinigung und Betriebsdokumentation
- Docker/CI/E2E auf Migrationen umstellen
- Dokumentation für Bootstrap, Accountanlage, De-/Reaktivierung, Support und Recovery
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, PostgreSQL-Integrationstests, `pnpm test:e2e` und `pnpm build`

## 8. Verbindliche Sicherheitstests

Die geforderten Fälle werden nicht nur als UI-Tests, sondern auf der serverseitigen Autorisierungs- und PostgreSQL-Zugriffsebene geprüft:

- gegenseitige Isolation zweier Tenants beim Listen- und Detailzugriff
- manipulierte Tenant- und Ressourcen-IDs
- gemeinsamer Arbeitsstand zweier Mitglieder desselben Tenants
- getrennte Arbeitsstände verschiedener Tenants
- genau eine Zugehörigkeit je Mitglied durch DB-Constraint
- sofortiger Verlust des Zugriffs bei Account- und Tenantdeaktivierung
- kontrollierte Reaktivierung ohne Datenverlust
- Accountdeaktivierung löscht keine Newsletter
- genau eine unabhängige Beispielkopie je neuem Tenant, auch bei erneutem Seed
- genau ein `newsletter.created` pro bewusstem Start; keines durch Autosave
- Adminliste für Admin, verweigerter Adminbereich für Mitglieder
- lesender Supportzugriff
- 403 und Audit für jede POST/PUT/PATCH/DELETE-Mutation im Supportmodus, einschließlich manipulierter Direktaufrufe
- Audit für Supportstart und -ende
- Löschung von Auditdaten älter als 90 Tage, Erhalt jüngerer Daten
- API-Antworten, Logs und Adminansicht enthalten keine Passwörter, Hashes, Tokens, Newsletterinhalte oder Stacktraces

## 9. Risiken und Prüfentscheidungen

1. **Magic Link als einziger Faktor:** Die geprüfte Produktentscheidung ersetzt die ursprüngliche Passwortanforderung. Das Verfahren ist für den geschlossenen Alpha-Test akzeptiert, erreicht aber kein höheres formales Authentifizierungsniveau und ist nur so belastbar wie das jeweilige E-Mail-Postfach. Empfehlung: kein paralleler Passwortweg; MFA für das Adminpostfach als verbindliche Betriebsanforderung.
2. **Bestehende Entwicklungsdaten:** Ohne bekannte Passwörter können alte Accounts nicht aktiv migriert werden. Empfehlung: Daten einem stabilen Entwicklungsmandanten zuordnen, Accounts deaktivieren und kontrolliert neu seeden; Newsletter/Assets bleiben erhalten.
3. **RLS:** Aktuell nicht sicher passend zum Pool-/Querymodell. Empfehlung: in dieser Phase nicht aktivieren und den transaktionsgebundenen Datenzugriff als Voraussetzung für eine spätere Defense-in-depth-Phase dokumentieren.
4. **Öffentliche Asset-URLs:** E-Mail-Bilder sind technisch öffentlich. Tenant-Isolation schützt Metadaten, Auflistung und Änderung; zufällige tenantpräfixierte Keys reduzieren Erratbarkeit, ersetzen aber keine Zugriffsautorisierung für nicht-öffentliche Dateien. Für Newsletterbilder ist diese Öffentlichkeit fachlich erforderlich.
5. **Support-Schreibschutz:** Eine reine UI-Sperre reicht nicht. Empfehlung: zentraler serverseitiger Mutationsguard plus Route-Inventartest; Supportende und Logout bleiben die einzigen Ausnahmen.
6. **Audit-Verfügbarkeit:** Kritische Admin-/Supportaktionen müssen bei Auditfehlern abbrechen; nichtkritische Nutzungsereignisse dürfen den Editor nicht unnötig unbrauchbar machen. Diese Trennung wird explizit implementiert und getestet.

Mit Freigabe dieses Plans beginnt Phase A. Vor einer potenziell destruktiven lokalen Datenbankbereinigung oder dem Installieren neuer Pakete wird der konkrete Befehl samt Ziel noch einmal sichtbar gemacht.
