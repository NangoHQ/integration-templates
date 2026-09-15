# incident-io actions

Uses Nango provider `incident-io`. The catalog covers incidents and updates, actions, follow-ups, timeline items, alerts, schedules and on-call discovery, teams, users, postmortems, incident roles/types/timestamps, severities/statuses, participants/workloads, and read-only catalog lookup. The existing [Mastra incident.io client](https://github.com/mastra-ai/mastra/pull/23327) informed the resource selection. Secret and API-key administration, alert ingestion, workflow/configuration mutations, schedule mutations, and destructive escalation operations are intentionally excluded.

Authenticate with an API-key connection configured in Nango. These providers do not use OAuth scopes; the API key's provider-side permissions control which operations are available. Give write access only when using create, update, or delete actions.

## Actions

| Action                                | Method | Provider path                                        |
| ------------------------------------- | ------ | ---------------------------------------------------- |
| `list-incident-statuses`              | GET    | `/v1/incident_statuses`                              |
| `get-incident-status`                 | GET    | `/v1/incident_statuses/{id}`                         |
| `list-incident-types`                 | GET    | `/v1/incident_types`                                 |
| `get-incident-type`                   | GET    | `/v1/incident_types/{id}`                            |
| `list-postmortem-documents`           | GET    | `/v1/postmortem_documents`                           |
| `get-postmortem-document`             | GET    | `/v1/postmortem_documents/{id}`                      |
| `get-postmortem-document-content`     | GET    | `/v1/postmortem_documents/{id}/content`              |
| `list-severities`                     | GET    | `/v1/severities`                                     |
| `get-severity`                        | GET    | `/v1/severities/{id}`                                |
| `list-alert-tags`                     | GET    | `/v2/alert_tags`                                     |
| `list-alerts`                         | GET    | `/v2/alerts`                                         |
| `get-alert`                           | GET    | `/v2/alerts/{id}`                                    |
| `add-alert-tags`                      | POST   | `/v2/alerts/{id}/actions/add_tags`                   |
| `remove-alert-tags`                   | POST   | `/v2/alerts/{id}/actions/remove_tags`                |
| `resolve-alert`                       | POST   | `/v2/alerts/{id}/actions/resolve`                    |
| `set-alert-tags`                      | POST   | `/v2/alerts/{id}/actions/set_tags`                   |
| `list-incident-alerts`                | GET    | `/v2/incident_alerts`                                |
| `create-incident-alert`               | POST   | `/v2/incident_alerts`                                |
| `transition-incident-alert`           | POST   | `/v2/incident_alerts/{id}/actions/transition`        |
| `list-incident-participant-workloads` | GET    | `/v2/incident_participant_workloads`                 |
| `list-incident-participants`          | GET    | `/v2/incident_participants`                          |
| `list-incident-roles`                 | GET    | `/v2/incident_roles`                                 |
| `get-incident-role`                   | GET    | `/v2/incident_roles/{id}`                            |
| `list-incident-timeline-items`        | GET    | `/v2/incident_timeline_items`                        |
| `create-incident-timeline-item`       | POST   | `/v2/incident_timeline_items`                        |
| `update-incident-timeline-item`       | PATCH  | `/v2/incident_timeline_items/{id}`                   |
| `list-incident-timestamps`            | GET    | `/v2/incident_timestamps`                            |
| `get-incident-timestamp`              | GET    | `/v2/incident_timestamps/{id}`                       |
| `list-incident-updates`               | GET    | `/v2/incident_updates`                               |
| `create-incident-update`              | POST   | `/v2/incident_updates`                               |
| `list-incidents`                      | GET    | `/v2/incidents`                                      |
| `create-incident`                     | POST   | `/v2/incidents`                                      |
| `get-incident`                        | GET    | `/v2/incidents/{id}`                                 |
| `update-incident`                     | POST   | `/v2/incidents/{id}/actions/edit`                    |
| `list-schedule-entries`               | GET    | `/v2/schedule_entries`                               |
| `list-schedule-overrides`             | GET    | `/v2/schedule_overrides`                             |
| `get-schedule-override`               | GET    | `/v2/schedule_overrides/{id}`                        |
| `list-schedules`                      | GET    | `/v2/schedules`                                      |
| `get-schedule`                        | GET    | `/v2/schedules/{id}`                                 |
| `list-schedule-replicas`              | GET    | `/v2/schedules/{schedule_id}/replicas`               |
| `get-schedule-replica`                | GET    | `/v2/schedules/{schedule_id}/replicas/{id}`          |
| `list-schedule-sync-rules`            | GET    | `/v2/schedules/{schedule_id}/sync_rules`             |
| `get-schedule-sync-rule`              | GET    | `/v2/schedules/{schedule_id}/sync_rules/{id}`        |
| `list-users`                          | GET    | `/v2/users`                                          |
| `get-user`                            | GET    | `/v2/users/{id}`                                     |
| `list-user-notification-methods`      | GET    | `/v2/users/{user_id}/notification_methods`           |
| `list-user-notification-rules`        | GET    | `/v2/users/{user_id}/notification_rules`             |
| `get-user-paging-provider`            | GET    | `/v2/users/{user_id}/paging_provider`                |
| `list-actions`                        | GET    | `/v3/actions`                                        |
| `create-action`                       | POST   | `/v3/actions`                                        |
| `get-action`                          | GET    | `/v3/actions/{id}`                                   |
| `update-action`                       | PUT    | `/v3/actions/{id}`                                   |
| `delete-action`                       | DELETE | `/v3/actions/{id}`                                   |
| `list-catalog-entries`                | GET    | `/v3/catalog_entries`                                |
| `get-catalog-entry`                   | GET    | `/v3/catalog_entries/{id}`                           |
| `list-catalog-resources`              | GET    | `/v3/catalog_resources`                              |
| `list-catalog-types`                  | GET    | `/v3/catalog_types`                                  |
| `get-catalog-type`                    | GET    | `/v3/catalog_types/{id}`                             |
| `list-follow-ups`                     | GET    | `/v3/follow_ups`                                     |
| `create-follow-up`                    | POST   | `/v3/follow_ups`                                     |
| `get-follow-up`                       | GET    | `/v3/follow_ups/{id}`                                |
| `update-follow-up`                    | PUT    | `/v3/follow_ups/{id}`                                |
| `delete-follow-up`                    | DELETE | `/v3/follow_ups/{id}`                                |
| `connect-follow-up-external-issue`    | POST   | `/v3/follow_ups/{id}/actions/connect_external_issue` |
| `list-teams`                          | GET    | `/v3/teams`                                          |
| `get-team`                            | GET    | `/v3/teams/{id}`                                     |

Inputs use provider parameter names. JSON request payloads are nested under `body` so path, query, and header arguments cannot leak into the payload. Responses retain provider field names and envelopes. Paginated actions return one page and expose `next_cursor` alongside the original pagination metadata; reuse it as `after`, preserving other filters and sort options. Stop when it is absent. Unpaginated list endpoints return their complete provider envelope.

GET, PUT, PATCH, and DELETE requests use three retries. The delete actions return an empty object because the provider answers 204 No Content. POST requests without a provider idempotency contract use zero retries to avoid duplicate side effects. `create-incident`, `create-incident-update`, and `create-incident-timeline-item` require a body `idempotency_key`, so they retry three times.

Incident responses may omit `slack_channel_id` and `slack_team_id`. The Slack channel is sometimes created asynchronously, Microsoft Teams workspaces have no Slack channel, and the team id is only set for Slack Enterprise Grid. `create-incident`, `get-incident`, `list-incidents`, and `update-incident` therefore accept both fields as optional even though the OpenAPI source lists them as required.

## Contract provenance and validation

Schemas were extracted from the official OpenAPI source recorded in `schema-source.json`, including required fields, enums, nullable fields, and numeric/array bounds. Reference objects are expanded locally so every action is independently usable. Provider response objects preserve unknown fields for forward compatibility. Review upstream API documentation when changing an action: OpenAPI examples and required flags can lag actual behavior.

`schema-source.json` records the source URL, SHA-256 of the source input, retrieval date, selected operations, and omitted complex query parameters. Tests use published examples and synthetic contract fixtures, **not live recordings**. No provider credentials were available for live validation.

Run the focused checks from the repository root:

```sh
npx vitest run integrations/incident-io/tests
npx eslint integrations/incident-io
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck integrations/incident-io/actions/*.ts
```
