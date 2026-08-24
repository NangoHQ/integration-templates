# Checkpoint backfill — verified part 2

This branch contains only checkpoint-backfill template changes whose complete changed-sync set was exercised through real Nango `dryrun --validate` and `dryrun --save` calls against working provider connections.

-   Branch: `marcin/NAN-6669/backfill-checkpoints--verified-part-2`
-   Base: `origin/main` at `80803b3b`
-   Verification date: 2026-08-24
-   Nango environment: `dev`

## Executive summary

| Measure                                            | Count |
| -------------------------------------------------- | ----: |
| Integrations in this branch                        |    20 |
| Working connections used                           |    20 |
| Broken connections in this branch                  |     0 |
| Changed sync source files                          |    66 |
| Syncs with real resumable checkpoints              |    65 |
| No-checkpoint API exceptions                       |     1 |
| Successful real `dryrun --validate` calls          |    66 |
| Successful real `dryrun --save` calls              |    66 |
| Snapshot JSON files changed or added               |    53 |
| Snapshots regenerated but byte-identical           |    13 |
| Generated test files changed or added              |    55 |
| Generated tests regenerated but byte-identical     |    11 |
| Snapshot files manually sanitized after generation |     4 |
| Selected integration test files passed             | 1,164 |
| Selected integration tests passed                  | 1,371 |

Sixteen connections were accessed through the admin-key organization and four through the organization owned by `api@nango.dev`. No API key is stored in this branch or report.

Freshdesk is no longer part of this branch: newer Freshdesk templates landed independently in [PR #646](https://github.com/NangoHQ/integration-templates/pull/646) before the final rebase. Cal.com was likewise removed from the speculative branch because its newer implementation landed in [PR #643](https://github.com/NangoHQ/integration-templates/pull/643). The counts in this report cover only changes still present relative to the current base.

## What “verified” means

Every listed sync successfully:

1. compiled;
2. made a real provider request during `dryrun --validate`;
3. completed `dryrun --save`;
4. regenerated its snapshot/test artifacts; and
5. passed the affected integration’s Vitest suite.

Google Drive and MillionVerifier initially had test-only failures after successful live validate/save calls. Google Drive passed unchanged on a clean rerun. MillionVerifier’s generated test needed a redacted mock connection because the sync reads its API key through `getConnection()`; after that security-safe test fix, its full integration suite passed.

## Included integrations and syncs

| Integration                                        | Syncs | Changed syncs                                                                                                                                       | Connection                                                                                                                                                               | Connection owner  | Result |
| -------------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------ |
| `canva`                                            |     2 | `brand-templates`, `designs`                                                                                                                        | [71363da0-7eeb-4afb-8916-2ae723460599](https://app.nango.dev/dev/connections/canva/71363da0-7eeb-4afb-8916-2ae723460599/auth)                                            | admin-key org     | Passed |
| `chargebee`                                        |     2 | `coupon-sets`, `item-families`                                                                                                                      | [86cc712d-5801-4652-a55b-889d1555fd0b](https://app.nango.dev/dev/connections/chargebee/86cc712d-5801-4652-a55b-889d1555fd0b/auth)                                        | admin-key org     | Passed |
| `datadog`                                          |     2 | `roles`, `teams`                                                                                                                                    | [ae892fd6-ba38-4007-bf7e-5bf4c1ccebdf](https://app.nango.dev/dev/connections/datadog/ae892fd6-ba38-4007-bf7e-5bf4c1ccebdf/auth)                                          | admin-key org     | Passed |
| `dynatrace-oauth`                                  |     1 | `service-users`                                                                                                                                     | [f6d90b8c-a8bf-414f-a17e-570c8265ed2a](https://app.nango.dev/dev/connections/dynatrace-oauth/f6d90b8c-a8bf-414f-a17e-570c8265ed2a/auth)                                  | admin-key org     | Passed |
| `github-app-oauth`                                 |     3 | `branches`, `deployments`, `releases`                                                                                                               | [9a029a76-8a73-4756-9e21-969c401dc8f9](https://app.nango.dev/dev/connections/github-app-oauth/9a029a76-8a73-4756-9e21-969c401dc8f9/auth)                                 | admin-key org     | Passed |
| `google-drive`                                     |     1 | `folders`                                                                                                                                           | [d773e21f-a33a-4589-9895-6acffa044523](https://app.nango.dev/dev/connections/google-drive/d773e21f-a33a-4589-9895-6acffa044523/auth)                                     | admin-key org     | Passed |
| `klaviyo`                                          |    12 | `catalog-categories`, `catalog-items`, `coupon-codes`, `coupons`, `forms`, `images`, `lists`, `metrics`, `reviews`, `segments`, `tags`, `templates` | [7d47618a-efdf-4a61-b108-ca20c4963c81](https://app.nango.dev/dev/connections/klaviyo/7d47618a-efdf-4a61-b108-ca20c4963c81/auth)                                          | api@nango.dev org | Passed |
| `lever`                                            |     6 | `opportunities-applications`, `opportunities-feedbacks`, `opportunities-interviews`, `opportunities-notes`, `postings-questions`, `stages`          | [942b3084-ec69-4142-8eec-c5cdec68ffb3](https://app.nango.dev/dev/connections/lever-basic/942b3084-ec69-4142-8eec-c5cdec68ffb3/auth)                                      | api@nango.dev org | Passed |
| `mandrill`                                         |     1 | `inbound-routes`                                                                                                                                    | [5deac6e6-9fe8-446d-abe7-7d63b3bd9905](https://app.nango.dev/dev/connections/mandrill/5deac6e6-9fe8-446d-abe7-7d63b3bd9905/auth)                                         | admin-key org     | Passed |
| `microsoft-dynamics-365-finance-and-operations-cc` |     2 | `legal-entities`, `warehouses`                                                                                                                      | [e90a613b-668b-4a40-b892-4dd3bea3f691](https://app.nango.dev/dev/connections/microsoft-dynamics-365-finance-and-operations-cc/e90a613b-668b-4a40-b892-4dd3bea3f691/auth) | admin-key org     | Passed |
| `microsoft-excel-oauth2-cc`                        |     1 | `worksheets`                                                                                                                                        | [794e05be-46a1-43e6-ac6c-8ae8772b67ac](https://app.nango.dev/dev/connections/microsoft-excel-oauth2-cc/794e05be-46a1-43e6-ac6c-8ae8772b67ac/auth)                        | admin-key org     | Passed |
| `millionverifier`                                  |     1 | `bulk-files`                                                                                                                                        | [d17829ac-98b0-444f-b3a6-bb8845494275](https://app.nango.dev/dev/connections/millionverifier/d17829ac-98b0-444f-b3a6-bb8845494275/auth)                                  | admin-key org     | Passed |
| `one-drive`                                        |     2 | `recent-items`, `user-files-selection`                                                                                                              | [61ce92ef-05b8-47a2-bfe6-03cbd05d5937](https://app.nango.dev/dev/connections/one-drive/61ce92ef-05b8-47a2-bfe6-03cbd05d5937/auth)                                        | admin-key org     | Passed |
| `outlook`                                          |     1 | `calendars`                                                                                                                                         | [451a7548-51fa-4de0-9687-fffd959e49a5](https://app.nango.dev/dev/connections/outlook/451a7548-51fa-4de0-9687-fffd959e49a5/auth)                                          | api@nango.dev org | Passed |
| `pinterest`                                        |     3 | `ad-accounts`, `boards`, `pins`                                                                                                                     | [ae0ffa1f-a025-4801-98c4-e210e65b6336](https://app.nango.dev/dev/connections/pinterest/ae0ffa1f-a025-4801-98c4-e210e65b6336/auth)                                        | api@nango.dev org | Passed |
| `todoist`                                          |     3 | `labels`, `projects`, `sections`                                                                                                                    | [04b6b0fa-3297-45e0-9a3d-10dee68160a3](https://app.nango.dev/dev/connections/todoist/04b6b0fa-3297-45e0-9a3d-10dee68160a3/auth)                                          | admin-key org     | Passed |
| `tripletex`                                        |     7 | `contacts`, `customers`, `employees`, `ledger-accounts`, `products`, `projects`, `suppliers`                                                        | [c04acb1f-4b32-41f3-8b33-af844e45173d](https://app.nango.dev/dev/connections/tripletex/c04acb1f-4b32-41f3-8b33-af844e45173d/auth)                                        | admin-key org     | Passed |
| `workable`                                         |     8 | `candidates-offer`, `employees`, `jobs-candidates`, `jobs-questions`, `jobs-stages`, `members`, `stages`, `timeoff-balances`                        | [cdef9e08-1850-45d1-b773-d711fb1d22ed](https://app.nango.dev/dev/connections/workable/cdef9e08-1850-45d1-b773-d711fb1d22ed/auth)                                         | admin-key org     | Passed |
| `youtube`                                          |     1 | `channels`                                                                                                                                          | [0dcb1480-db7d-4b85-affa-019a39b6fe68](https://app.nango.dev/dev/connections/youtube/0dcb1480-db7d-4b85-affa-019a39b6fe68/auth)                                          | admin-key org     | Passed |
| `zendesk`                                          |     7 | `categories`, `groups`, `macros`, `sections`, `ticket-fields`, `ticket-forms`, `views`                                                              | [5d71ac00-c85e-4ff5-addd-4f30e0520dd9](https://app.nango.dev/dev/connections/zendesk/5d71ac00-c85e-4ff5-addd-4f30e0520dd9/auth)                                          | admin-key org     | Passed |

All connection links above open the `dev` reconnect page directly.

## Manually sanitized snapshots

The provider responses are still real request results. Only credential-bearing request/URL material was replaced with stable placeholders after `--save`.

| Snapshot                                                  | What was changed                                                            | Why                                                                                                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integrations/canva/tests/designs.test.json`              | 40 encoded AWS credential/signature query values replaced with `<REDACTED>` | Canva returned temporary signed asset URLs; committing their credential/signature components would leak secret-like values and trigger push protection. |
| `integrations/workable/tests/employees.test.json`         | 288 AWS credential/signature query values replaced with `<REDACTED>`        | Workable returned temporary signed asset URLs in both recorded responses and mapped records.                                                            |
| `integrations/workable/tests/timeoff-balances.test.json`  | 144 AWS credential/signature query values replaced with `<REDACTED>`        | Same signed-URL security issue.                                                                                                                         |
| `integrations/millionverifier/tests/bulk-files.test.json` | The recorded `key` request parameter replaced with `<REDACTED_API_KEY>`     | The snapshot recorder captured the live MillionVerifier API key. The generated test uses the same placeholder.                                          |

No provider response records were invented or manually rewritten.

## No-checkpoint exception

### `workable/stages`

The previous checkpoint was an empty `z.object({})` and could not resume any work. It was removed.

The [Workable stages endpoint documentation](https://workable.readme.io/reference/stages) exposes a single `GET /spi/v3/stages` request and lists no query parameters—no page, cursor, offset, time range, or continuation token. Therefore there is no real progress state to save. Supported request parameters: **none**.

The sync still validates the full response and uses deletion tracking, but adding a fake checkpoint would not make a timed-out execution resumable.

## Active connections that did not qualify

These integrations remain in the speculative PR because at least one changed sync did not complete the full live verification bar.

| Integration       | Changed syncs | Connection                                                                                                                               | Connection owner  | Blocking result                                                                                                       |
| ----------------- | ------------: | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `connectsecure`   |             5 | [c9ef67b1-e23f-4aa5-9563-8f773e7826fd](https://app.nango.dev/dev/connections/connectsecure/c9ef67b1-e23f-4aa5-9563-8f773e7826fd/auth)    | admin-key org     | All five changed endpoints returned 403.                                                                              |
| `github`          |             1 | [9a029a76-8a73-4756-9e21-969c401dc8f9](https://app.nango.dev/dev/connections/github-app-oauth/9a029a76-8a73-4756-9e21-969c401dc8f9/auth) | admin-key org     | The repository traversal timed out through the proxy with 504, including the retry.                                   |
| `gong`            |             4 | [8a2632ad-047e-4c8c-ae61-8db94e15c67f](https://app.nango.dev/dev/connections/gong-oauth/8a2632ad-047e-4c8c-ae61-8db94e15c67f/auth)       | admin-key org     | `library-folders` returned 400 Bad request; the other three changed syncs passed.                                     |
| `google-ads`      |             2 | [892a25cd-ab96-4d8b-b687-d7e106b9d3dc](https://app.nango.dev/dev/connections/google-ads/892a25cd-ab96-4d8b-b687-d7e106b9d3dc/auth)       | admin-key org     | Required connection metadata (`developerToken` and customer IDs) is absent.                                           |
| `hubstaff`        |             3 | [7ba8c3c4-a643-4986-990a-58c179b1c512](https://app.nango.dev/dev/connections/hubstaff/7ba8c3c4-a643-4986-990a-58c179b1c512/auth)         | admin-key org     | All three changed endpoints returned 401 `invalid_token`.                                                             |
| `microsoft-teams` |             5 | [a0918aff-f7d6-4ddb-8260-632135ed52d9](https://app.nango.dev/dev/connections/microsoft-teams/a0918aff-f7d6-4ddb-8260-632135ed52d9/auth)  | admin-key org     | Four changed endpoints returned 401 because the account has no valid Teams license.                                   |
| `ninety-io`       |             2 | [8c5b0dc2-d809-438d-bd9d-2933eb90b101](https://app.nango.dev/dev/connections/ninety-io/8c5b0dc2-d809-438d-bd9d-2933eb90b101/auth)        | admin-key org     | Both changed endpoints returned 429 tier rate-limit errors, including a cooldown retry.                               |
| `okta`            |             8 | [fd93445d-26b6-4cb8-9dd0-c85f78e3a7b5](https://app.nango.dev/dev/connections/okta-cc/fd93445d-26b6-4cb8-9dd0-c85f78e3a7b5/auth)          | admin-key org     | `policies` returned 400 because the account lacks the `ENTITY_RISK_POLICY` feature; seven other changed syncs passed. |
| `pipelinecrm`     |             2 | [31ff6c41-73e4-433a-b477-c6ec1c4a04e0](https://app.nango.dev/dev/connections/pipelinecrm/31ff6c41-73e4-433a-b477-c6ec1c4a04e0/auth)      | admin-key org     | Both changed endpoints returned 403 because the provider account is cancelled.                                        |
| `tiktok-ads`      |             4 | [nango-sandbox](https://app.nango.dev/dev/connections/tiktok-accounts/nango-sandbox/auth)                                                | api@nango.dev org | `pixels` returned a payload without the required `data` object; three other changed syncs passed.                     |
| `tiktok-personal` |             1 | [nango-sandbox-temp](https://app.nango.dev/dev/connections/tiktok-accounts/nango-sandbox-temp/auth)                                      | api@nango.dev org | `videos` returned 404 from `/v2/video/list/`.                                                                         |

## Repository validation

-   Full integration compilation: passed (6,410 functions).
-   Affected integration suites: 1,164 test files passed; 1,371 tests passed.
-   Checkpoint lifecycle audit: 65/65 checkpointed syncs contain checkpoint configuration and get/save/clear usage; `clearCheckpoint()` precedes `trackDeletesEnd()`.
-   `workable/stages`: explicitly reviewed as the sole unpageable exception.
-   Secret review: signed URL credentials/signatures and MillionVerifier’s API key were redacted before commit.
