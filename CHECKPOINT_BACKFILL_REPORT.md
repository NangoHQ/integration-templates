# Speculative checkpoint backfill review

This branch contains checkpoint changes derived from source/API analysis that still lack a complete successful live `dryrun --validate` + `dryrun --save` verification.

-   Branch: `marcin/NAN-6669/backfill-checkpoints--speculative`
-   Rebuilt from: `origin/main` at `80803b3b`
-   Split date: 2026-08-24
-   Verified subsets moved to: [PR #649](https://github.com/NangoHQ/integration-templates/pull/649) and [PR #660](https://github.com/NangoHQ/integration-templates/pull/660)

## Executive summary

| Measure                                                |                            Count |
| ------------------------------------------------------ | -------------------------------: |
| Integrations remaining                                 |                               24 |
| Changed sync source files                              |                               67 |
| Real checkpoint implementations                        |                               66 |
| No-checkpoint API exceptions                           |                                1 |
| Successful real `dryrun --save` calls represented here |                                0 |
| Snapshot JSON files changed                            |                                0 |
| Generated test TypeScript files changed                |                                1 |
| Snapshots manually modified                            |                                0 |
| Repository compile                                     |           6,410 functions passed |
| Affected integration tests                             | 1,087 files / 1,275 tests passed |
| Integrations moved to verified part 2                  |                               21 |
| Sync changes moved to verified part 2                  |                               68 |
| Integrations moved to verified part 3                  |                                6 |
| Sync changes moved to verified part 3                  |                               28 |

Baseline snapshots are preserved on this branch because no remaining sync completed the full live verification bar. The source changes compile and are testable, but provider behavior is not represented by newly saved fixtures.

## Remaining integrations and blockers

| Integration       | Syncs | Changed syncs                                                                                                                           | Connection (dev)                                                                                                                         | Why it remains speculative                                                               |
| ----------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `1password-scim`  |     1 | `scim-users`                                                                                                                            | Not configured                                                                                                                           | No connection configured.                                                                |
| `adp`             |     1 | `unified-employees`                                                                                                                     | Not configured                                                                                                                           | No connection configured.                                                                |
| `aws-iam`         |     1 | `users`                                                                                                                                 | Not configured                                                                                                                           | No connection configured.                                                                |
| `box`             |     1 | `users`                                                                                                                                 | [3aaf1702-c0ec-4700-9bbb-c135ff5167bc](https://app.nango.dev/dev/connections/box/3aaf1702-c0ec-4700-9bbb-c135ff5167bc/auth)              | 403: the connection cannot list enterprise users.                                        |
| `close`           |     3 | `pipelines`, `sequences`, `users`                                                                                                       | [d87cabc9-bf29-4af9-9e07-b4daeebbfa70](https://app.nango.dev/dev/connections/close/d87cabc9-bf29-4af9-9e07-b4daeebbfa70/auth)            | 401 Unauthorized; some calls also need metadata.                                         |
| `connectsecure`   |     5 | `agents`, `companies`, `problem_groups`, `users`, `vulnerabilities`                                                                     | [c9ef67b1-e23f-4aa5-9563-8f773e7826fd](https://app.nango.dev/dev/connections/connectsecure/c9ef67b1-e23f-4aa5-9563-8f773e7826fd/auth)    | All five changed endpoints returned 403.                                                 |
| `figma`           |     2 | `comments`, `projects`                                                                                                                  | [1dc4bb1f-e9d5-4a65-af25-15d2535df190](https://app.nango.dev/dev/connections/figma/1dc4bb1f-e9d5-4a65-af25-15d2535df190/auth)            | 404: the deprecated team-projects endpoint is unavailable for this connection.           |
| `github`          |     1 | `repositories`                                                                                                                          | [9a029a76-8a73-4756-9e21-969c401dc8f9](https://app.nango.dev/dev/connections/github-app-oauth/9a029a76-8a73-4756-9e21-969c401dc8f9/auth) | The repository traversal ended in a 504 gateway timeout, including retry.                |
| `gong`            |     4 | `call-outcomes`, `library-folders`, `scorecards`, `trackers`                                                                            | [8a2632ad-047e-4c8c-ae61-8db94e15c67f](https://app.nango.dev/dev/connections/gong-oauth/8a2632ad-047e-4c8c-ae61-8db94e15c67f/auth)       | `library-folders` returned 400 Bad request; three other changed syncs passed.            |
| `google`          |     1 | `workspace-org-units`                                                                                                                   | Not configured                                                                                                                           | No connection configured.                                                                |
| `gusto`           |     2 | `employees`, `unified-employees`                                                                                                        | Not configured                                                                                                                           | No connection configured.                                                                |
| `instantly`       |     2 | `custom-tags`, `webhooks`                                                                                                               | [0ecdcd1a-50c0-4ead-81dc-b019da18c0fd](https://app.nango.dev/dev/connections/instantly/0ecdcd1a-50c0-4ead-81dc-b019da18c0fd/auth)        | 402 Payment Required for the changed endpoints.                                          |
| `mailchimp`       |     3 | `audiences`, `automations`, `stores`                                                                                                    | [263b8d18-1729-4eaf-84c7-392aaabbbd88](https://app.nango.dev/dev/connections/mailchimp/263b8d18-1729-4eaf-84c7-392aaabbbd88/auth)        | 400 `base_url_override_not_allowed` in proxy configuration.                              |
| `make`            |     3 | `hooks`, `incomplete-executions`, `scenarios`                                                                                           | [fd1f21f1-ffcc-4c9a-8726-2189752fcf2d](https://app.nango.dev/dev/connections/make/fd1f21f1-ffcc-4c9a-8726-2189752fcf2d/auth)             | 401: required provider scopes are missing.                                               |
| `microsoft-teams` |     5 | `channel-message-replies`, `chat-members`, `chats`, `joined-teams`, `team-members`                                                      | [a0918aff-f7d6-4ddb-8260-632135ed52d9](https://app.nango.dev/dev/connections/microsoft-teams/a0918aff-f7d6-4ddb-8260-632135ed52d9/auth)  | Four changed endpoints returned 401 because no valid Teams license is present.           |
| `ninety-io`       |     2 | `rocks`, `todos`                                                                                                                        | [8c5b0dc2-d809-438d-bd9d-2933eb90b101](https://app.nango.dev/dev/connections/ninety-io/8c5b0dc2-d809-438d-bd9d-2933eb90b101/auth)        | 429 tier rate limit on both syncs, including cooldown retry.                             |
| `okta`            |     8 | `application-users`, `applications`, `authorization-servers`, `factors`, `group-memberships`, `policies`, `role-assignments`, `schemas` | [fd93445d-26b6-4cb8-9dd0-c85f78e3a7b5](https://app.nango.dev/dev/connections/okta-cc/fd93445d-26b6-4cb8-9dd0-c85f78e3a7b5/auth)          | `policies` returned 400 because `ENTITY_RISK_POLICY` is unavailable; seven syncs passed. |
| `ring-central`    |     2 | `contacts`, `users`                                                                                                                     | Not configured                                                                                                                           | No connection configured.                                                                |
| `tiktok-ads`      |     4 | `ad-groups`, `automated-rules`, `catalogs`, `pixels`                                                                                    | [nango-sandbox](https://app.nango.dev/dev/connections/tiktok-accounts/nango-sandbox/auth)                                                | `pixels` returned a payload without the required `data`; three syncs passed.             |
| `tiktok-personal` |     1 | `videos`                                                                                                                                | [nango-sandbox-temp](https://app.nango.dev/dev/connections/tiktok-accounts/nango-sandbox-temp/auth)                                      | `videos` returned 404 from `/v2/video/list/`.                                            |
| `woocommerce`     |     5 | `customers`, `product-categories`, `product-reviews`, `product-tags`, `product-variations`                                              | [60a533b5-fe26-4637-985f-26d3e5d68c5a](https://app.nango.dev/dev/connections/woocommerce/60a533b5-fe26-4637-985f-26d3e5d68c5a/auth)      | Connection ID was not found in dev.                                                      |
| `workday`         |     6 | `employees`, `groups`, `job-profiles`, `locations`, `organizations`, `positions`                                                        | [f835d3ab-41ca-4aca-bb65-ee9c82a1a5e0](https://app.nango.dev/dev/connections/workday/f835d3ab-41ca-4aca-bb65-ee9c82a1a5e0/auth)          | Connection ID was not found in dev.                                                      |
| `zoho-people`     |     3 | `departments`, `designations`, `holidays`                                                                                               | [718f044d-f6f2-4ebf-94d7-d92865f88531](https://app.nango.dev/dev/connections/zoho-people/718f044d-f6f2-4ebf-94d7-d92865f88531/auth)      | 403: these APIs are unavailable on the connected pricing plan.                           |
| `zoom`            |     1 | `webinars`                                                                                                                              | [7252ea99-4476-410e-a830-3f45f80ebeac](https://app.nango.dev/dev/connections/zoom/7252ea99-4476-410e-a830-3f45f80ebeac/auth)             | 400: Webinar plan is not enabled for the connected user.                                 |

## No-checkpoint exception

### `figma/projects`

The [official Figma GET team projects documentation](https://developers.figma.com/docs/rest-api/projects-endpoints/#get-team-projects) defines:

-   HTTP method/path: `GET /v1/teams/:team_id/projects`
-   Path parameters: `team_id`
-   Query parameters: **none**
-   Body parameters: **none**

The endpoint returns the visible projects in one response. The branch removes unsupported cursor/page-size pagination scaffolding and calls it once, so there is no meaningful checkpoint state. The endpoint is now deprecated by Figma in favor of the v2 folders API, and the available connection returned 404; therefore this remains speculative.

## Snapshot policy

No snapshot JSON was regenerated or manually edited on this branch. The remaining TypeScript test change is a test-harness adjustment for Figma; existing JSON fixtures remain the baseline.

## Additional source-audit correction

The final checkpoint lifecycle audit found that `microsoft-teams/chats` and `microsoft-teams/team-members` read their checkpoints without awaiting the asynchronous call. Both reads now use `await nango.getCheckpoint()`. These changes remain speculative because the available Microsoft Teams connection does not have a valid Teams license, so the affected endpoints could not complete live verification.

## What moved to verified part 2

PR #649 contains 21 integrations / 68 sync changes that all passed real provider validation, save, generated tests, and affected integration suites. Its reports document the 55 changed/new snapshots and the four required credential sanitizations.

During the final rebase, `cal-com-v2/event-types` and `cal-com-v2/events` were removed from this PR because newer implementations landed independently on `main` in PR #643. This report and the counts above cover only changes still introduced by this branch.

## What moved to verified part 3

[PR #660](https://github.com/NangoHQ/integration-templates/pull/660) contains the refreshed ActiveCampaign, Azure DevOps, Google Ads, Hubstaff, Intercom, and PipelineCRM connections: 6 integrations / 28 sync changes. All 28 syncs passed real provider validation and snapshot saving. Their old broken-connection rows and source changes have been removed from this speculative branch.

## Review guidance

-   Refresh or replace the connections linked above, then rerun every changed sync with both `--validate` and `--save`.
-   Supply missing integration metadata and provider scopes where called out.
-   Do not promote an integration after only a subset of its changed syncs passes.
-   Keep baseline snapshots untouched until a real save succeeds.
