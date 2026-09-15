# resend actions

Uses Nango provider `resend`. The catalog covers transactional and received email, attachments, metrics, domains, templates, audiences, contacts, broadcasts, webhooks, segments, topics, and contact properties. Sending forwards `idempotency_key` as `Idempotency-Key`; reuse the same key when retrying the same email. Without a key, automatic POST retries are disabled. A sending-only key cannot access most account resources; use a full-access key where required. Credential and OAuth grant administration, webhook signing-secret rotation, logs, automations, events, and suppressions are intentionally excluded.

Authenticate with an API-key connection configured in Nango. These providers do not use OAuth scopes; the API key's provider-side permissions control which operations are available. Give write access only when using create, update, or delete actions.

## Actions

| Action                            | Method | Provider path                                              |
| --------------------------------- | ------ | ---------------------------------------------------------- |
| `list-audiences`                  | GET    | `/audiences`                                               |
| `create-audience`                 | POST   | `/audiences`                                               |
| `get-audience`                    | GET    | `/audiences/{id}`                                          |
| `delete-audience`                 | DELETE | `/audiences/{id}`                                          |
| `list-broadcasts`                 | GET    | `/broadcasts`                                              |
| `create-broadcast`                | POST   | `/broadcasts`                                              |
| `get-broadcast`                   | GET    | `/broadcasts/{id}`                                         |
| `update-broadcast`                | PATCH  | `/broadcasts/{id}`                                         |
| `delete-broadcast`                | DELETE | `/broadcasts/{id}`                                         |
| `cancel-broadcast`                | POST   | `/broadcasts/{id}/cancel`                                  |
| `list-broadcast-clicked-links`    | GET    | `/broadcasts/{id}/clicked-links`                           |
| `list-broadcast-recipients`       | GET    | `/broadcasts/{id}/recipients`                              |
| `send-broadcast`                  | POST   | `/broadcasts/{id}/send`                                    |
| `list-contact-properties`         | GET    | `/contact-properties`                                      |
| `create-contact-property`         | POST   | `/contact-properties`                                      |
| `get-contact-property`            | GET    | `/contact-properties/{id}`                                 |
| `update-contact-property`         | PATCH  | `/contact-properties/{id}`                                 |
| `delete-contact-property`         | DELETE | `/contact-properties/{id}`                                 |
| `list-contacts`                   | GET    | `/contacts`                                                |
| `create-contact`                  | POST   | `/contacts`                                                |
| `list-contact-imports`            | GET    | `/contacts/imports`                                        |
| `create-contact-import`           | POST   | `/contacts/imports`                                        |
| `get-contact-import`              | GET    | `/contacts/imports/{id}`                                   |
| `list-contact-segments`           | GET    | `/contacts/{contact_id}/segments`                          |
| `add-contact-to-segment`          | POST   | `/contacts/{contact_id}/segments/{segment_id}`             |
| `remove-contact-from-segment`     | DELETE | `/contacts/{contact_id}/segments/{segment_id}`             |
| `list-contact-topics`             | GET    | `/contacts/{contact_id}/topics`                            |
| `update-contact-topics`           | PATCH  | `/contacts/{contact_id}/topics`                            |
| `get-contact`                     | GET    | `/contacts/{id}`                                           |
| `update-contact`                  | PATCH  | `/contacts/{id}`                                           |
| `delete-contact`                  | DELETE | `/contacts/{id}`                                           |
| `list-domains`                    | GET    | `/domains`                                                 |
| `create-domain`                   | POST   | `/domains`                                                 |
| `create-domain-claim`             | POST   | `/domains/claim`                                           |
| `get-domain`                      | GET    | `/domains/{domain_id}`                                     |
| `update-domain`                   | PATCH  | `/domains/{domain_id}`                                     |
| `delete-domain`                   | DELETE | `/domains/{domain_id}`                                     |
| `get-domain-claim`                | GET    | `/domains/{domain_id}/claim`                               |
| `verify-domain-claim`             | POST   | `/domains/{domain_id}/claim/verify`                        |
| `verify-domain`                   | POST   | `/domains/{domain_id}/verify`                              |
| `list-emails`                     | GET    | `/emails`                                                  |
| `send-email`                      | POST   | `/emails`                                                  |
| `send-email-batch`                | POST   | `/emails/batch`                                            |
| `get-email-metrics`               | GET    | `/emails/metrics`                                          |
| `list-received-emails`            | GET    | `/emails/receiving`                                        |
| `get-received-email`              | GET    | `/emails/receiving/{email_id}`                             |
| `list-received-email-attachments` | GET    | `/emails/receiving/{email_id}/attachments`                 |
| `get-received-email-attachment`   | GET    | `/emails/receiving/{email_id}/attachments/{attachment_id}` |
| `get-email`                       | GET    | `/emails/{email_id}`                                       |
| `update-email`                    | PATCH  | `/emails/{email_id}`                                       |
| `list-email-attachments`          | GET    | `/emails/{email_id}/attachments`                           |
| `get-email-attachment`            | GET    | `/emails/{email_id}/attachments/{attachment_id}`           |
| `cancel-email`                    | POST   | `/emails/{email_id}/cancel`                                |
| `share-email`                     | POST   | `/emails/{email_id}/share`                                 |
| `list-segments`                   | GET    | `/segments`                                                |
| `create-segment`                  | POST   | `/segments`                                                |
| `get-segment`                     | GET    | `/segments/{id}`                                           |
| `update-segment`                  | PATCH  | `/segments/{id}`                                           |
| `delete-segment`                  | DELETE | `/segments/{id}`                                           |
| `list-templates`                  | GET    | `/templates`                                               |
| `create-template`                 | POST   | `/templates`                                               |
| `get-template`                    | GET    | `/templates/{id}`                                          |
| `update-template`                 | PATCH  | `/templates/{id}`                                          |
| `delete-template`                 | DELETE | `/templates/{id}`                                          |
| `duplicate-template`              | POST   | `/templates/{id}/duplicate`                                |
| `publish-template`                | POST   | `/templates/{id}/publish`                                  |
| `list-topics`                     | GET    | `/topics`                                                  |
| `create-topic`                    | POST   | `/topics`                                                  |
| `get-topic`                       | GET    | `/topics/{id}`                                             |
| `update-topic`                    | PATCH  | `/topics/{id}`                                             |
| `delete-topic`                    | DELETE | `/topics/{id}`                                             |
| `list-webhooks`                   | GET    | `/webhooks`                                                |
| `create-webhook`                  | POST   | `/webhooks`                                                |
| `get-webhook`                     | GET    | `/webhooks/{webhook_id}`                                   |
| `update-webhook`                  | PATCH  | `/webhooks/{webhook_id}`                                   |
| `delete-webhook`                  | DELETE | `/webhooks/{webhook_id}`                                   |
| `list-webhook-events`             | GET    | `/webhooks/{webhook_id}/events`                            |
| `get-webhook-event`               | GET    | `/webhooks/{webhook_id}/events/{event_id}`                 |
| `list-webhook-event-attempts`     | GET    | `/webhooks/{webhook_id}/events/{event_id}/attempts`        |
| `replay-webhook-event`            | POST   | `/webhooks/{webhook_id}/events/{event_id}/replay`          |

Inputs use provider parameter names. JSON request payloads are nested under `body` so path, query, and header arguments cannot leak into the payload. Responses retain provider field names and envelopes. Paginated actions return one page and expose `next_cursor` alongside the original pagination metadata. Reuse it as `after` when paging forward, or as `before` when the request used `before`, preserving other filters. `after` and `before` are mutually exclusive. Stop when `next_cursor` is absent. Unpaginated list endpoints return their complete provider envelope.

GET, PUT, PATCH, and DELETE requests use three retries. POST requests without a provider idempotency contract use zero retries to avoid duplicate side effects. Email and batch sending retry only with an explicit `idempotency_key`.

`create-contact-import` takes the CSV contents as text in `body.file` and sends them as the provider's `multipart/form-data` upload; `column_map`, `segments`, and `topics` are JSON-encoded form parts, and `on_conflict` is a plain text form field. Keep the CSV within the action input size limits.

## Contract provenance and validation

Schemas were extracted from the official OpenAPI source recorded in `schema-source.json`, including required fields, enums, nullable fields, and numeric/array bounds. Reference objects are expanded locally so every action is independently usable. Provider response objects preserve unknown fields for forward compatibility. Review upstream API documentation when changing an action: OpenAPI examples and required flags can lag actual behavior.

`schema-source.json` records the source URL, SHA-256 of the source input, retrieval date, selected operations, and omitted complex query parameters. Tests use published examples and synthetic contract fixtures, **not live recordings**. No provider credentials were available for live validation.

Run the focused checks from the repository root:

```sh
npx vitest run integrations/resend/tests
npx eslint integrations/resend
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck integrations/resend/actions/*.ts
```
