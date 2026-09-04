# Betrieb der Alpha-Administration

## Erstinstallation und Migration

1. Vor der ersten Migration einer bestehenden Installation ein PostgreSQL- und MinIO-Backup erstellen. Der sichere Ablauf einschließlich Übernahme vorhandener externer Volumes steht in [`production-deployment.md`](production-deployment.md).
2. Pflichtvariablen setzen, insbesondere `DATABASE_URL`, `APP_URL`, SMTP/S3 und ein zufälliges `AUTH_RATE_LIMIT_SECRET` mit mindestens 32 Zeichen. Für den automatischen Erst-Admin zusätzlich `BOOTSTRAP_ADMIN_EMAIL` und `BOOTSTRAP_ADMIN_NAME` setzen.
3. Das Production-Deployment führt zuerst den separaten Service `migrate` und danach den einmaligen Service `bootstrap-admin` aus. Ohne Compose kann beides manuell ausgeführt werden.
4. Für lokale Entwicklung optional `pnpm db:seed` ausführen. Dieser Seed ist idempotent, in Produktion gesperrt und erzeugt standardmäßig den Plattform-Admin `admin@example.test` sowie den Mitarbeiter `local@example.test`. Im lokalen Docker-Stack wird er automatisch ausgeführt.

## Einziger Plattform-Administrator

Lokal kann sich der automatisch erzeugte Admin `admin@example.test` direkt über `/login` einen Magic Link an Mailpit senden lassen. `DEV_ADMIN_EMAIL` und `DEV_ADMIN_NAME` überschreiben diese Entwicklungswerte.

In Produktion wird der Admin bevorzugt über die Deployment-Konfiguration gebootstrapped:

```dotenv
BOOTSTRAP_ADMIN_EMAIL=owner@example.com
BOOTSTRAP_ADMIN_NAME="Installation Owner"
```

Der One-shot-Service legt den Admin nur an, wenn weder ein abgeschlossener Installationszustand noch ein anderer Plattform-Admin existiert. Derselbe Wert ist bei weiteren Deployments ein No-op. Eine andere konfigurierte Adresse schlägt fehl und ändert niemals Berechtigungen. Nach erfolgreicher Initialisierung können die beiden Variablen entfernt werden.

Für manuelle Installationen bleibt der CLI-Befehl verfügbar:

```bash
pnpm admin:bootstrap --email admin@example.com --name "Plattform Admin"
```

Das Kommando erzeugt weder Magic Link noch Session. Der Administrator fordert danach auf `/login` selbst einen Magic Link an. Sein E-Mail-Konto muss mit MFA geschützt sein. Eine weitere Adminanlage über UI oder API existiert nicht.

### Explizite Wiederherstellung

Wenn das Adminpostfach verloren oder der einzige Admin deaktiviert wurde, darf die Env-Konfiguration ihn nicht automatisch ersetzen oder reaktivieren. Ein Operator mit Serverzugriff kann bewusst ausführen:

```bash
pnpm admin:recover --current-email bisher@example.com --email neu@example.com --name "Installation Owner"
```

Die Bestätigung der bisherigen Adresse ist Pflicht. Der vorhandene Admin wird aktualisiert und reaktiviert, sämtliche Adminsessions werden widerrufen und der Vorgang wird als Sicherheitsereignis auditiert.

## SMTP und Magic Links prüfen

Production benötigt ein echtes erreichbares SMTP-Konto. Port `465` verwendet implizites TLS, Port `587` STARTTLS. Die Anwendung legt beim Bootstrap keine Session an und sendet noch keine Nachricht; die Mail entsteht erst beim Anfordern des Magic Links auf `/login`.

Ohne Secrets auszugeben lassen sich die gesetzten Werte so prüfen:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T web node -e "console.log({host:process.env.SMTP_HOST,port:process.env.SMTP_PORT,userSet:Boolean(process.env.SMTP_USER),passwordSet:Boolean(process.env.SMTP_PASSWORD),from:process.env.SMTP_FROM,appUrl:process.env.APP_URL})"
```

Danach die Web-Logs während einer Linkanforderung beobachten:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
```

Typische Ursachen sind gesperrte ausgehende SMTP-Ports, falsche Zugangsdaten, ein nicht zum SMTP-Konto erlaubter `SMTP_FROM`-Absender oder fehlende DNS-Freigaben beim Mailanbieter.

## Mandanten und Accounts

- `/admin` legt Mandanten an und zeigt Status, Accountanzahl, letzte Logins, Aktivität und jüngste Fehler.
- Die Tenantdetailseite bearbeitet Stammdaten, legt Mitarbeiter mit Name/E-Mail an und steuert Statuswechsel.
- Bei der Accountanlage wird keine E-Mail versendet. Der Tester fordert seinen Link selbst über `/login` an.
- Deaktivierungen benötigen eine Browserbestätigung und eine serverseitig zur Ziel-ID passende Bestätigung.
- Accountdeaktivierung widerruft dessen Sessions. Tenantdeaktivierung widerruft die Sessions aller Mitarbeiter.
- Accounts, Newsletter, Assets, Einstellungen und Audits werden nicht gelöscht. Reaktivierung stellt den kontrollierten Loginzugang wieder her.

## Lesender Supportmodus

1. Auf der Tenantdetailseite „Lesenden Supportmodus starten“ auswählen.
2. Die Anwendung zeigt auf jeder Seite einen permanenten gelben Banner mit Name und ID des betrachteten Mandanten.
3. Lesen und Export sind erlaubt. Fachliche und administrative Mutationen werden zentral mit HTTP 403 blockiert und als `support.write_blocked` auditiert.
4. „Supportmodus verlassen“ im Banner löscht den serverseitigen Supportkontext und protokolliert `support.ended`. Logout beendet ihn ebenfalls mit Audit.

Der Admin bleibt stets als Akteur erkennbar; es findet keine Benutzer-Impersonation statt.

## Logs, Fehler und Aufbewahrung

- `/admin/logs` filtert nach Mandant, Ereignistyp, Schweregrad und Zeitraum.
- Adminansichten enthalten nur bereinigte Zusammenfassungen und Korrelations-IDs, keine Stacktraces, Token, Header oder Newsletterinhalte.
- Manuelle Bereinigung: `pnpm audit:purge`.
- Production Compose betreibt `audit-cleanup` täglich. Andere Plattformen müssen dasselbe Kommando mindestens einmal täglich planen.
- Ereignisse älter als 90 Tage werden gelöscht. Abgelaufene Rate-Limits und sehr alte Authentifizierungsartefakte werden mitbereinigt.

## Notfall und Recovery

- Bei kompromittiertem Mitarbeiterkonto: Account deaktivieren; dadurch werden Sessions sofort widerrufen.
- Bei kompromittiertem Mandanten: Mandant deaktivieren; alle Mitarbeiter verlieren Zugriff, Daten bleiben erhalten.
- Bei kompromittiertem Adminpostfach: Zugriff auf das Postfach sperren, `pnpm admin:recover` über lokalen Serverzugriff ausführen und anschließend das neue Postfach absichern. Ein zweiter Admin darf nicht als Workaround angelegt werden.
- Audit- und Anwendungslogs anhand der Korrelations-ID zusammenführen; unbearbeitete Stacktraces bleiben ausschließlich im geschützten Serverlog.
