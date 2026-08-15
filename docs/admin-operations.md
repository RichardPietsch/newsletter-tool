# Betrieb der Alpha-Administration

## Erstinstallation und Migration

1. Vor der ersten Migration einer bestehenden Installation ein PostgreSQL-Backup erstellen.
2. Pflichtvariablen setzen, insbesondere `DATABASE_URL`, `APP_URL`, SMTP/S3 und ein zufälliges `AUTH_RATE_LIMIT_SECRET` mit mindestens 32 Zeichen.
3. `pnpm db:migrate` ausführen. Die Migration ordnet vorhandene Entwicklungsdaten kontrolliert dem Entwicklungsmandanten zu und widerruft alte Links und Sessions.
4. Für lokale Entwicklung optional `pnpm db:seed` ausführen. Dieser Seed ist idempotent und in Produktion gesperrt.

## Einziger Plattform-Administrator

```bash
pnpm admin:bootstrap --email admin@example.com --name "Plattform Admin"
```

Das Kommando erzeugt weder Magic Link noch Session und verweigert einen zweiten Plattform-Administrator. Der Administrator fordert danach auf `/login` selbst einen Magic Link an. Sein E-Mail-Konto muss mit MFA geschützt sein. Eine weitere Adminanlage über UI oder API existiert nicht.

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
- Bei kompromittiertem Adminpostfach: Zugriff auf das Postfach sperren, aktive Adminsessions direkt in PostgreSQL widerrufen und anschließend das Postfach absichern. Ein zweiter Admin darf nicht als Workaround angelegt werden.
- Audit- und Anwendungslogs anhand der Korrelations-ID zusammenführen; unbearbeitete Stacktraces bleiben ausschließlich im geschützten Serverlog.
