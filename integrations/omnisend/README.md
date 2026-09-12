# Omnisend Nango Functions (local MVP)

Generische Nango Functions und Syncs für die Omnisend REST API `2026-03-15`.
Der Katalog enthält alle 82 eindeutigen Operationen aus dem versionierten lokalen
OpenAPI-Snapshot. Die Implementierung ist unabhängig von blueM und enthält keine
kundenspezifische Freigabe- oder Tenant-Policy.

## Lokaler Ablauf

```bash
npm install
npm run generate
npm test
npm run compile
```

`npm run generate` liest die OpenAPI-Dateien aus
`../omnisend-api-specs/openapi` und erzeugt Actions, Syncs sowie die
`generated/operation-matrix.json`. Die Quelle ist in
`generated/source-lock.json` auf einen Commit gepinnt. Die redundanten
Drittanbieter-Dateien werden per Inhalt dedupliziert; Änderungen am Snapshot
werden im Matrix-Test sichtbar.

Die generierten Zod-Grenzen übernehmen die dokumentierten Top-Level-Felder,
Primitive, Enums, Arrays und flache verschachtelte Objekte. Bei stark
polymorphen oder rekursiven Omnisend-Payloads bleibt `z.unknown()` bewusst als
MVP-Fallback erhalten; die Request-Route bleibt trotzdem statisch gebunden.

## Authentifizierung

Nango injiziert den API-Key in `Authorization` als
`Omnisend-API-Key <secret>`. Jede Function sendet außerdem
`Omnisend-Version: 2026-03-15`. Kein Secret wird in Source, Fixtures, Logs oder
generierten Artefakten gespeichert.

## Schreiboperationen

Alle in der Omnisend-API veröffentlichten Schreiboperationen sind als Actions
registriert, einschließlich Campaign Send/Test, Automation Enable/Disable,
Events, Kontaktmutationen und Löschoperationen. Dieses Projekt setzt keine
Kunden-Policy durch. Für den lokalen Testlauf werden jedoch ausschließlich
GET-Requests gegen den vorhandenen Produktions-Key ausgeführt; insbesondere
werden keine E-Mails, SMS, Push-Nachrichten, Automationen oder sonstigen
produktiven Mutationen ausgelöst.

Write-E2E ist für einen separaten Test-Account vorgesehen.
