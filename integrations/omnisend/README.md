# Omnisend Nango Functions (local MVP)

Generische Nango Functions und Syncs für die Omnisend REST API `2026-03-15`.
Der Katalog enthält alle 82 eindeutigen Operationen aus dem versionierten lokalen
OpenAPI-Snapshot. Die Implementierung ist unabhängig von blueM und enthält keine
kundenspezifische Freigabe- oder Tenant-Policy.

## Lokaler Ablauf

Die Actions und Syncs sind als Quellcode committed und in
`integrations/index.ts` registriert. Für diesen Provider gibt es im
Template-Repository keinen Generator und keine lokale OpenAPI-Quelle.

```bash
npm install
npm test
npm run compile:integrations
npx prettier --config .prettierrc --check \
  integrations/omnisend/shared.ts \
  integrations/omnisend/actions/*.ts \
  integrations/omnisend/syncs/*.ts \
  integrations/omnisend/tests/*.ts
npx eslint integrations/omnisend/shared.ts integrations/omnisend/actions \
  integrations/omnisend/syncs --ext .ts
```

Der Omnisend-Vertragstest liegt unter
`integrations/omnisend/tests/omnisend-contract.test.ts`. Die generierten
Zod-Grenzen übernehmen die dokumentierten Top-Level-Felder, Primitive, Enums,
Arrays und flache verschachtelte Objekte. Bei stark polymorphen oder
rekursiven Omnisend-Payloads bleibt `z.unknown()` bewusst als MVP-Fallback
erhalten; die Request-Route bleibt trotzdem statisch gebunden.

## Authentifizierung

Nango injiziert den API-Key in `Authorization` als
`Omnisend-API-Key <secret>`. Jede Function sendet außerdem
`Omnisend-Version: 2026-03-15`. Kein Secret wird in Source, Fixtures, Logs oder
generierten Artefakten gespeichert.

## Schreiboperationen

Für den sicheren lokalen Produktions-Smoke-Test ist ausschließlich ein
separat neu angelegtes Segment mit den beiden Testadressen zulässig. Es dürfen
keine bestehenden Templates, Segmente oder Kontakte geändert werden. Aktionen,
die E-Mails, SMS, Push-Nachrichten oder Automationen senden/aktivieren können,
werden nicht ausgelöst. Der getestete Write-Read-back muss die neu angelegte
Ressource per ID verifizieren.
