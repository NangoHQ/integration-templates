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

| Integration                                        | Syncs | Changed syncs                                                                                                                                       | Connection | Connection owner  | Result |
| -------------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------- | ------ |
| `canva`                                            |     2 | `brand-templates`, `designs`                                                                                                                        | Redacted   | admin-key org     | Passed |
| `chargebee`                                        |     2 | `coupon-sets`, `item-families`                                                                                                                      | Redacted   | admin-key org     | Passed |
| `datadog`                                          |     2 | `roles`, `teams`                                                                                                                                    | Redacted   | admin-key org     | Passed |
| `dynatrace-oauth`                                  |     1 | `service-users`                                                                                                                                     | Redacted   | admin-key org     | Passed |
| `github-app-oauth`                                 |     3 | `branches`, `deployments`, `releases`                                                                                                               | Redacted   | admin-key org     | Passed |
| `google-drive`                                     |     1 | `folders`                                                                                                                                           | Redacted   | admin-key org     | Passed |
| `klaviyo`                                          |    12 | `catalog-categories`, `catalog-items`, `coupon-codes`, `coupons`, `forms`, `images`, `lists`, `metrics`, `reviews`, `segments`, `tags`, `templates` | Redacted   | api@nango.dev org | Passed |
| `lever`                                            |     6 | `opportunities-applications`, `opportunities-feedbacks`, `opportunities-interviews`, `opportunities-notes`, `postings-questions`, `stages`          | Redacted   | api@nango.dev org | Passed |
| `mandrill`                                         |     1 | `inbound-routes`                                                                                                                                    | Redacted   | admin-key org     | Passed |
| `microsoft-dynamics-365-finance-and-operations-cc` |     2 | `legal-entities`, `warehouses`                                                                                                                      | Redacted   | admin-key org     | Passed |
| `microsoft-excel-oauth2-cc`                        |     1 | `worksheets`                                                                                                                                        | Redacted   | admin-key org     | Passed |
| `millionverifier`                                  |     1 | `bulk-files`                                                                                                                                        | Redacted   | admin-key org     | Passed |
| `one-drive`                                        |     2 | `recent-items`, `user-files-selection`                                                                                                              | Redacted   | admin-key org     | Passed |
| `outlook`                                          |     1 | `calendars`                                                                                                                                         | Redacted   | api@nango.dev org | Passed |
| `pinterest`                                        |     3 | `ad-accounts`, `boards`, `pins`                                                                                                                     | Redacted   | api@nango.dev org | Passed |
| `todoist`                                          |     3 | `labels`, `projects`, `sections`                                                                                                                    | Redacted   | admin-key org     | Passed |
| `tripletex`                                        |     7 | `contacts`, `customers`, `employees`, `ledger-accounts`, `products`, `projects`, `suppliers`                                                        | Redacted   | admin-key org     | Passed |
| `workable`                                         |     8 | `candidates-offer`, `employees`, `jobs-candidates`, `jobs-questions`, `jobs-stages`, `members`, `stages`, `timeoff-balances`                        | Redacted   | admin-key org     | Passed |
| `youtube`                                          |     1 | `channels`                                                                                                                                          | Redacted   | admin-key org     | Passed |
| `zendesk`                                          |     7 | `categories`, `groups`, `macros`, `sections`, `ticket-fields`, `ticket-forms`, `views`                                                              | Redacted   | admin-key org     | Passed |

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

| Integration       | Changed syncs | Connection | Connection owner  | Blocking result                                                                                                       |
| ----------------- | ------------: | ---------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `connectsecure`   |             5 | Redacted   | admin-key org     | All five changed endpoints returned 403.                                                                              |
| `github`          |             1 | Redacted   | admin-key org     | The repository traversal timed out through the proxy with 504, including the retry.                                   |
| `gong`            |             4 | Redacted   | admin-key org     | `library-folders` returned 400 Bad request; the other three changed syncs passed.                                     |
| `google-ads`      |             2 | Redacted   | admin-key org     | Required connection metadata (`developerToken` and customer IDs) is absent.                                           |
| `hubstaff`        |             3 | Redacted   | admin-key org     | All three changed endpoints returned 401 `invalid_token`.                                                             |
| `microsoft-teams` |             5 | Redacted   | admin-key org     | Four changed endpoints returned 401 because the account has no valid Teams license.                                   |
| `ninety-io`       |             2 | Redacted   | admin-key org     | Both changed endpoints returned 429 tier rate-limit errors, including a cooldown retry.                               |
| `okta`            |             8 | Redacted   | admin-key org     | `policies` returned 400 because the account lacks the `ENTITY_RISK_POLICY` feature; seven other changed syncs passed. |
| `pipelinecrm`     |             2 | Redacted   | admin-key org     | Both changed endpoints returned 403 because the provider account is cancelled.                                        |
| `tiktok-ads`      |             4 | Redacted   | api@nango.dev org | `pixels` returned a payload without the required `data` object; three other changed syncs passed.                     |
| `tiktok-personal` |             1 | Redacted   | api@nango.dev org | `videos` returned 404 from `/v2/video/list/`.                                                                         |

## Repository validation

-   Full integration compilation: passed (6,410 functions).
-   Affected integration suites: 1,164 test files passed; 1,371 tests passed.
-   Checkpoint lifecycle audit: 65/65 checkpointed syncs contain checkpoint configuration and get/save/clear usage; `clearCheckpoint()` precedes `trackDeletesEnd()`.
-   `workable/stages`: explicitly reviewed as the sole unpageable exception.
-   Secret review: signed URL credentials/signatures and MillionVerifier’s API key were redacted before commit.
