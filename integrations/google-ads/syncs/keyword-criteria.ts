import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const KeywordCriterionSchema = z.object({
    id: z.string(),
    resource_name: z.string(),
    customer_id: z.string(),
    campaign_id: z.string(),
    ad_group_id: z.string(),
    criterion_id: z.string(),
    keyword_text: z.string().optional(),
    keyword_match_type: z.string().optional(),
    negative: z.boolean().optional(),
    status: z.string().optional()
});

// Checkpoint values must be scalars (string/number/boolean); the set of initialized customer IDs
// is encoded as a comma-separated string rather than an array.
const CheckpointSchema = z.object({
    updated_after: z.string(),
    initialized_customer_ids: z.string()
});

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).optional(),
    login_customer_id: z.string().optional(),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const SearchStreamResultSchema = z.object({
    adGroupCriterion: z.object({
        resourceName: z.string(),
        status: z.string().optional(),
        negative: z.boolean().optional(),
        keyword: z
            .object({
                text: z.string().optional(),
                matchType: z.string().optional()
            })
            .optional()
    }),
    adGroup: z
        .object({
            resourceName: z.string().optional(),
            id: z.string().optional()
        })
        .optional(),
    campaign: z
        .object({
            resourceName: z.string().optional(),
            id: z.string().optional()
        })
        .optional()
});

const ChangeStatusResultSchema = z.object({
    changeStatus: z.object({
        resourceStatus: z.string(),
        lastChangeDateTime: z.string().optional(),
        adGroupCriterion: z.string().optional()
    })
});

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// googleAds:searchStream returns every result chunk within a single HTTP response (either a JSON
// array of chunks, or one chunk object) - it never accepts a pageToken for further HTTP requests.
// https://developers.google.com/google-ads/api/docs/reporting/streaming
//
// Throws on a genuinely unrecognized envelope shape rather than silently degrading to an empty
// result, so a malformed/unexpected response can never be misread as "there is nothing here" —
// which, combined with full-refresh deletion reconciliation, could otherwise purge every
// previously-synced record for a customer based on a bad response.
function extractSearchStreamRows(data: unknown): unknown[] {
    if (Array.isArray(data)) {
        return data.flatMap((chunk: unknown) => {
            if (!isObject(chunk)) {
                throw new Error('Unexpected searchStream chunk: expected an object.');
            }
            const results = chunk['results'];
            if (results === undefined) {
                return [];
            }
            if (!Array.isArray(results)) {
                throw new Error('Unexpected searchStream chunk: `results` is present but not an array.');
            }
            return results;
        });
    }
    if (isObject(data)) {
        const results = data['results'];
        if (results === undefined) {
            return [];
        }
        if (!Array.isArray(results)) {
            throw new Error('Unexpected searchStream response: `results` is present but not an array.');
        }
        return results;
    }
    throw new Error('Unexpected searchStream response: expected an array of chunks or a single chunk object.');
}

function formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateOnly(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00.000Z`);
}

function addDays(dateStr: string, days: number): string {
    const date = parseDateOnly(dateStr);
    date.setUTCDate(date.getUTCDate() + days);
    return formatDate(date);
}

function daysBetween(startStr: string, endStr: string): number {
    return Math.round((parseDateOnly(endStr).getTime() - parseDateOnly(startStr).getTime()) / (24 * 60 * 60 * 1000));
}

// change_status only guarantees 90 days of retention; a checkpoint older than that must trigger
// a full refresh instead of an incremental query, or Google Ads rejects the filter.
// https://developers.google.com/google-ads/api/docs/change-status
const CHANGE_STATUS_RETENTION_DAYS = 90;

// Walks [startStr, endStr] one calendar day at a time; a saturated day is further split by time
// (see collectChangeStatusRows) so no window can silently drop changes beyond LIMIT 10000.
function* eachDayInclusive(startStr: string, endStr: string): Generator<string> {
    let current = startStr;
    let iterations = 0;
    while (current <= endStr && iterations < 3650) {
        yield current;
        current = addDays(current, 1);
        iterations++;
    }
}

function parseDateTime(dateTimeStr: string): Date {
    return new Date(`${dateTimeStr.replace(' ', 'T')}Z`);
}

function formatDateTime(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function midpointDateTime(startStr: string, endStr: string): string {
    const startMs = parseDateTime(startStr).getTime();
    const endMs = parseDateTime(endStr).getTime();
    return formatDateTime(new Date(startMs + Math.floor((endMs - startMs) / 2)));
}

// A single change_status query is capped at LIMIT 10000. A window that saturates that cap is
// split in half by time and re-queried recursively, so a high-churn day never silently loses
// changes beyond the first 10,000. Windows are half-open [start, end) — the first half ends
// exclusively at `mid` and the second half starts inclusively at `mid` — so there is never a gap
// between them; a change_status literal at exactly the midpoint instant is counted exactly once,
// even though last_change_date_time carries microsecond precision the query literals can't
// express directly. A 24-hour window needs at most 17 splits to reach 1-second resolution (the
// finest the API can filter on); MAX_CHANGE_STATUS_SPLIT_DEPTH gives head room beyond that so a
// window only fails once it truly cannot be split further (>=10000 changes in a single second).
const MAX_CHANGE_STATUS_SPLIT_DEPTH = 24;

type ChangeStatusRow = { status: string; resourceName: string };

async function collectChangeStatusRows(
    fetchWindow: (start: string, end: string) => Promise<ChangeStatusRow[]>,
    startStr: string,
    endStr: string,
    depth: number,
    sink: Map<string, string>
): Promise<void> {
    const rows = await fetchWindow(startStr, endStr);
    if (rows.length >= 10000) {
        if (depth >= MAX_CHANGE_STATUS_SPLIT_DEPTH) {
            throw new Error(
                `change_status query saturated (>=10000 rows) for window [${startStr}, ${endStr}) even after ${depth} splits; refusing to advance the checkpoint to avoid silently dropping changes.`
            );
        }
        const mid = midpointDateTime(startStr, endStr);
        if (mid === startStr || mid === endStr) {
            throw new Error(
                `change_status window [${startStr}, ${endStr}) cannot be split further (already at 1-second resolution) but is still saturated; refusing to advance the checkpoint.`
            );
        }
        await collectChangeStatusRows(fetchWindow, startStr, mid, depth + 1, sink);
        await collectChangeStatusRows(fetchWindow, mid, endStr, depth + 1, sink);
        return;
    }
    for (const row of rows) {
        sink.set(row.resourceName, row.status);
    }
}

function extractCustomerId(resourceName: string): string | undefined {
    return resourceName.match(/^customers\/(\d+)\//)?.[1];
}

function extractIdsFromResourceName(resourceName: string) {
    const match = resourceName.match(/customers\/(\d+)\/adGroupCriteria\/(\d+)~(\d+)/);
    if (!match || !match[1] || !match[2] || !match[3]) {
        return null;
    }
    return {
        customer_id: match[1],
        ad_group_id: match[2],
        criterion_id: match[3]
    };
}

function mapResultToKeywordCriterion(result: z.infer<typeof SearchStreamResultSchema>) {
    const ac = result.adGroupCriterion;
    if (!ac) {
        return null;
    }
    const ids = extractIdsFromResourceName(ac.resourceName);
    if (!ids) {
        return null;
    }
    const campaignId = result.campaign?.id ?? '';
    const adGroupId = result.adGroup?.id ?? ids.ad_group_id;
    return {
        id: ac.resourceName,
        resource_name: ac.resourceName,
        customer_id: ids.customer_id,
        campaign_id: campaignId,
        ad_group_id: adGroupId,
        criterion_id: ids.criterion_id,
        keyword_text: ac.keyword?.text,
        keyword_match_type: ac.keyword?.matchType,
        negative: ac.negative,
        status: ac.status
    };
}

async function fetchKeywordCriteriaViaSearchStream(nango: NangoSyncLocal, customerId: string, headers: Record<string, string>, query: string) {
    const proxyConfig: ProxyConfiguration = {
        // https://developers.google.com/google-ads/api/docs/reporting/streaming
        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
        method: 'POST',
        headers,
        data: { query },
        retries: 3
    };

    const response = await nango.post(proxyConfig);
    const rows = extractSearchStreamRows(response.data);
    const parsed = z.array(SearchStreamResultSchema).safeParse(rows);
    if (!parsed.success) {
        throw new Error(`Failed to parse SearchStream results: ${parsed.error.message}`);
    }

    const criteria: z.infer<typeof KeywordCriterionSchema>[] = [];
    for (const result of parsed.data) {
        const criterion = mapResultToKeywordCriterion(result);
        if (criterion) {
            criteria.push(criterion);
        }
    }
    return criteria;
}

async function fetchChangeStatusForWindow(
    nango: NangoSyncLocal,
    customerId: string,
    headers: Record<string, string>,
    start: string,
    end: string
): Promise<ChangeStatusRow[]> {
    const query = `
        SELECT
            change_status.resource_status,
            change_status.last_change_date_time,
            change_status.ad_group_criterion
        FROM change_status
        WHERE change_status.resource_type = 'AD_GROUP_CRITERION'
            AND change_status.last_change_date_time >= '${start}'
            AND change_status.last_change_date_time < '${end}'
        LIMIT 10000
    `;

    const proxyConfig: ProxyConfiguration = {
        // https://developers.google.com/google-ads/api/docs/change-status
        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
        method: 'POST',
        headers,
        data: { query },
        retries: 3
    };

    const response = await nango.post(proxyConfig);
    const rows = extractSearchStreamRows(response.data);
    const parsed = z.array(ChangeStatusResultSchema).safeParse(rows);
    if (!parsed.success) {
        throw new Error(`Failed to parse change_status results: ${parsed.error.message}`);
    }

    const result: ChangeStatusRow[] = [];
    for (const change of parsed.data) {
        const resourceName = change.changeStatus.adGroupCriterion;
        if (!resourceName) {
            continue;
        }
        result.push({ status: change.changeStatus.resourceStatus, resourceName });
    }
    return result;
}

const sync = createSync({
    description: 'Sync ad group keyword criteria for customer accounts in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        KeywordCriterion: KeywordCriterionSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Invalid metadata');
        }
        const customerIds = parsedMetadata.data.customer_ids;
        if (!customerIds || customerIds.length === 0) {
            throw new Error('customer_ids is required in metadata');
        }

        const loginCustomerId = parsedMetadata.data.login_customer_id;
        const developerToken = parsedMetadata.data.developer_token;
        const headers: Record<string, string> = {
            'developer-token': developerToken,
            ...(loginCustomerId && { 'login-customer-id': loginCustomerId })
        };

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : undefined;
        const globalUpdatedAfter = parsedCheckpoint && parsedCheckpoint.success ? parsedCheckpoint.data.updated_after : undefined;
        const currentCustomerIds = new Set(customerIds);
        // Prune to customers currently in scope: if a customer was previously removed from
        // metadata.customer_ids and is now added back, it must not be treated as already
        // initialized — any changes made while it was out of scope would otherwise be missed.
        const initializedCustomerIds = new Set(
            (parsedCheckpoint && parsedCheckpoint.success ? (parsedCheckpoint.data.initialized_customer_ids ?? '') : '')
                .split(',')
                .filter(Boolean)
                .filter((id) => currentCustomerIds.has(id))
        );

        const now = formatDate(new Date());

        const customerNeedsFullRefresh = new Map<string, boolean>();
        for (const customerId of customerIds) {
            const isNewAccount = !initializedCustomerIds.has(customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, now) >= CHANGE_STATUS_RETENTION_DAYS;
            customerNeedsFullRefresh.set(customerId, !globalUpdatedAfter || isNewAccount || isStaleCheckpoint);
        }

        // A full refresh only fetches currently-active keyword criteria; without this, anything
        // removed (or removed while the checkpoint was stale/uninitialized) would linger in the
        // model forever. Build a one-time map of previously-synced IDs per customer so each
        // full-refresh branch can delete whatever it no longer sees.
        const previousIdsByCustomer = new Map<string, Set<string>>();
        if ([...customerNeedsFullRefresh.values()].some(Boolean)) {
            for await (const record of nango.listRecords('KeywordCriterion')) {
                const id = String(record.id);
                const custId = extractCustomerId(id);
                if (!custId) {
                    continue;
                }
                let bucket = previousIdsByCustomer.get(custId);
                if (!bucket) {
                    bucket = new Set();
                    previousIdsByCustomer.set(custId, bucket);
                }
                bucket.add(id);
            }
        }

        for (const customerId of customerIds) {
            const needsFullRefresh = customerNeedsFullRefresh.get(customerId) ?? true;

            if (needsFullRefresh) {
                const fullQuery = `
                    SELECT
                        ad_group_criterion.resource_name,
                        ad_group_criterion.status,
                        ad_group_criterion.negative,
                        ad_group_criterion.keyword.text,
                        ad_group_criterion.keyword.match_type,
                        ad_group.id,
                        campaign.id
                    FROM ad_group_criterion
                    WHERE ad_group_criterion.type = 'KEYWORD'
                `;
                const criteria = await fetchKeywordCriteriaViaSearchStream(nango, customerId, headers, fullQuery);

                const previousIds = previousIdsByCustomer.get(customerId);
                if (previousIds) {
                    const currentIds = new Set(criteria.map((c) => c.id));
                    const staleIds = [...previousIds].filter((id) => !currentIds.has(id));
                    if (staleIds.length > 0) {
                        await nango.batchDelete(
                            staleIds.map((id) => ({ id })),
                            'KeywordCriterion'
                        );
                    }
                }

                if (criteria.length > 0) {
                    await nango.batchSave(criteria, 'KeywordCriterion');
                }
            } else {
                if (!globalUpdatedAfter) {
                    throw new Error('Invariant violated: incremental path reached without a checkpoint.');
                }
                const updatedAfter = globalUpdatedAfter;
                const changeSink = new Map<string, string>();

                // change_status.last_change_date_time is reported in the account's own timezone,
                // not UTC. Walking one extra day past the UTC "now" watermark (while still
                // checkpointing at the true, unpadded value) absorbs that skew so a change that
                // Google timestamps as being "ahead" of UTC is never missed.
                for (const day of eachDayInclusive(updatedAfter, addDays(now, 1))) {
                    await collectChangeStatusRows(
                        (start, end) => fetchChangeStatusForWindow(nango, customerId, headers, start, end),
                        `${day} 00:00:00`,
                        `${addDays(day, 1)} 00:00:00`,
                        0,
                        changeSink
                    );
                }

                const removed: Array<{ id: string }> = [];
                const changedResourceNames: string[] = [];
                for (const [resourceName, status] of changeSink) {
                    if (status === 'REMOVED') {
                        removed.push({ id: resourceName });
                    } else if (status === 'ADDED' || status === 'CHANGED') {
                        changedResourceNames.push(resourceName);
                    }
                }

                if (removed.length > 0) {
                    await nango.batchDelete(removed, 'KeywordCriterion');
                }

                if (changedResourceNames.length > 0) {
                    const batchSize = 1000;
                    for (let i = 0; i < changedResourceNames.length; i += batchSize) {
                        const batch = changedResourceNames.slice(i, i + batchSize);
                        const inClause = batch.map((name) => `'${name}'`).join(',');
                        const refetchQuery = `
                            SELECT
                                ad_group_criterion.resource_name,
                                ad_group_criterion.status,
                                ad_group_criterion.negative,
                                ad_group_criterion.keyword.text,
                                ad_group_criterion.keyword.match_type,
                                ad_group.id,
                                campaign.id
                            FROM ad_group_criterion
                            WHERE ad_group_criterion.type = 'KEYWORD'
                                AND ad_group_criterion.resource_name IN (${inClause})
                        `;
                        const criteria = await fetchKeywordCriteriaViaSearchStream(nango, customerId, headers, refetchQuery);
                        if (criteria.length > 0) {
                            await nango.batchSave(criteria, 'KeywordCriterion');
                        }
                    }
                }
            }

            initializedCustomerIds.add(customerId);
        }

        await nango.saveCheckpoint({ updated_after: now, initialized_customer_ids: [...initializedCustomerIds].join(',') });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
