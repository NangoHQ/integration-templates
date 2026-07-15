import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).min(1).describe('Google Ads customer IDs to sync campaign budgets for'),
    login_customer_id: z.string().optional().describe('Manager account ID for API access hierarchy'),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

// Checkpoint values must be scalars (string/number/boolean); the set of initialized customer IDs
// is encoded as a comma-separated string rather than an array.
const CheckpointSchema = z.object({
    updated_after: z.string(),
    initialized_customer_ids: z.string()
});

const CampaignBudgetSchema = z.object({
    id: z.string().describe('Stable resource name of the campaign budget'),
    resourceName: z.string().describe('The resource name of the campaign budget'),
    amountMicros: z.string().optional().describe('The amount of the budget in micros'),
    explicitlyShared: z.boolean().optional().describe('Whether the budget is explicitly shared across campaigns'),
    status: z.string().optional().describe('The status of the campaign budget'),
    name: z.string().optional().describe('The name of the campaign budget')
});

const ChangeStatusResultSchema = z.object({
    changeStatus: z
        .object({
            resourceType: z.string(),
            resourceStatus: z.string(),
            lastChangeDateTime: z.string(),
            campaignBudget: z.string().optional()
        })
        .optional()
});

const CampaignBudgetResultSchema = z.object({
    campaignBudget: z
        .object({
            resourceName: z.string(),
            id: z.string(),
            amountMicros: z.string().optional(),
            explicitlyShared: z.boolean().optional(),
            status: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
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
// previously-synced budget for a customer based on a bad response.
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

type ChangeStatusRow = { status: string; resourceName: string; lastChangeDateTime: string };

async function collectChangeStatusRows(
    fetchWindow: (start: string, end: string) => Promise<ChangeStatusRow[]>,
    startStr: string,
    endStr: string,
    depth: number,
    sink: Map<string, { resourceStatus: string; lastChangeDateTime: string }>
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
        const existing = sink.get(row.resourceName);
        if (!existing || row.lastChangeDateTime > existing.lastChangeDateTime) {
            sink.set(row.resourceName, { resourceStatus: row.status, lastChangeDateTime: row.lastChangeDateTime });
        }
    }
}

function extractCustomerId(resourceName: string): string | undefined {
    return resourceName.match(/^customers\/(\d+)\//)?.[1];
}

function mapCampaignBudgetRows(rows: z.infer<typeof CampaignBudgetResultSchema>[]): Array<{
    id: string;
    resourceName: string;
    amountMicros?: string;
    explicitlyShared?: boolean;
    status?: string;
    name?: string;
}> {
    const budgets: Array<{
        id: string;
        resourceName: string;
        amountMicros?: string;
        explicitlyShared?: boolean;
        status?: string;
        name?: string;
    }> = [];
    for (const row of rows) {
        const cb = row.campaignBudget;
        if (!cb) {
            continue;
        }
        budgets.push({
            id: cb.resourceName,
            resourceName: cb.resourceName,
            ...(cb.amountMicros != null && { amountMicros: cb.amountMicros }),
            ...(cb.explicitlyShared != null && { explicitlyShared: cb.explicitlyShared }),
            ...(cb.status != null && { status: cb.status }),
            ...(cb.name != null && { name: cb.name })
        });
    }
    return budgets;
}

const sync = createSync({
    description: 'Sync campaign budgets for customer accounts in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        CampaignBudget: CampaignBudgetSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }

        const { customer_ids: customerIds, login_customer_id: loginCustomerId, developer_token: developerToken } = metadataResult.data;
        if (!customerIds || customerIds.length === 0) {
            throw new Error('customer_ids is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = checkpointResult && checkpointResult.success ? checkpointResult.data : null;
        const now = formatDate(new Date());
        const globalUpdatedAfter = checkpoint?.updated_after ? checkpoint.updated_after : undefined;
        const currentCustomerIds = new Set(customerIds);
        // Prune to customers currently in scope: if a customer was previously removed from
        // metadata.customer_ids and is now added back, it must not be treated as already
        // initialized — any changes made while it was out of scope would otherwise be missed.
        const initializedCustomerIds = new Set(
            (checkpoint?.initialized_customer_ids ?? '')
                .split(',')
                .filter(Boolean)
                .filter((id) => currentCustomerIds.has(id))
        );

        const headers: Record<string, string> = {
            'developer-token': developerToken
        };
        if (loginCustomerId) {
            headers['login-customer-id'] = loginCustomerId;
        }

        const customerNeedsFullRefresh = new Map<string, boolean>();
        for (const customerId of customerIds) {
            const isNewAccount = !initializedCustomerIds.has(customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, now) >= CHANGE_STATUS_RETENTION_DAYS;
            customerNeedsFullRefresh.set(customerId, !globalUpdatedAfter || isNewAccount || isStaleCheckpoint);
        }

        // A full refresh only fetches currently-active budgets; without this, anything removed
        // (or removed while the checkpoint was stale/uninitialized) would linger in the model
        // forever. Build a one-time map of previously-synced IDs per customer so each full-refresh
        // branch can delete whatever it no longer sees.
        const previousIdsByCustomer = new Map<string, Set<string>>();
        if ([...customerNeedsFullRefresh.values()].some(Boolean)) {
            for await (const record of nango.listRecords('CampaignBudget')) {
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
                await runFullFetch(nango, customerId, headers, previousIdsByCustomer.get(customerId));
            } else {
                if (!globalUpdatedAfter) {
                    throw new Error('Invariant violated: incremental path reached without a checkpoint.');
                }
                await runIncrementalFetch(nango, customerId, headers, globalUpdatedAfter, now);
            }

            initializedCustomerIds.add(customerId);
        }

        await nango.saveCheckpoint({ updated_after: now, initialized_customer_ids: [...initializedCustomerIds].join(',') });
    }
});

async function runFullFetch(
    nango: Parameters<(typeof sync)['exec']>[0],
    customerId: string,
    headers: Record<string, string>,
    previousIds: Set<string> | undefined
): Promise<void> {
    const fullQuery = `
        SELECT
            campaign_budget.resource_name,
            campaign_budget.id,
            campaign_budget.amount_micros,
            campaign_budget.explicitly_shared,
            campaign_budget.status,
            campaign_budget.name
        FROM campaign_budget
    `;

    const proxyConfig: ProxyConfiguration = {
        // https://developers.google.com/google-ads/api/docs/reporting/streaming
        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
        method: 'POST',
        data: { query: fullQuery },
        headers,
        retries: 3
    };

    const response = await nango.post(proxyConfig);
    const rows = extractSearchStreamRows(response.data);
    const parseResult = z.array(CampaignBudgetResultSchema).safeParse(rows);
    if (!parseResult.success) {
        throw new Error(`Failed to parse campaign budget rows: ${parseResult.error.message}`);
    }

    const mapped = mapCampaignBudgetRows(parseResult.data);
    const activeBudgets = mapped.filter((b) => b.status !== 'REMOVED');
    const activeIds = new Set(activeBudgets.map((b) => b.id));

    // A plain campaign_budget query (no status filter) returns REMOVED budgets too — route those
    // to delete instead of upserting them. Combine with the previousIds/currentIds reconciliation
    // via a Set so a budget that is both REMOVED in this fetch and absent from previousIds is
    // never queued for deletion twice.
    const idsToDelete = new Set(mapped.filter((b) => b.status === 'REMOVED').map((b) => b.id));
    if (previousIds) {
        for (const id of previousIds) {
            if (!activeIds.has(id)) {
                idsToDelete.add(id);
            }
        }
    }
    if (idsToDelete.size > 0) {
        await nango.batchDelete(
            [...idsToDelete].map((id) => ({ id })),
            'CampaignBudget'
        );
    }

    if (activeBudgets.length > 0) {
        await nango.batchSave(activeBudgets, 'CampaignBudget');
    }
}

async function runIncrementalFetch(
    nango: Parameters<(typeof sync)['exec']>[0],
    customerId: string,
    headers: Record<string, string>,
    updatedAfter: string,
    now: string
): Promise<void> {
    const changeMap = new Map<string, { resourceStatus: string; lastChangeDateTime: string }>();

    const fetchWindow = async (start: string, end: string): Promise<ChangeStatusRow[]> => {
        const changeStatusQuery = `
            SELECT
                change_status.resource_type,
                change_status.resource_status,
                change_status.campaign_budget,
                change_status.last_change_date_time
            FROM change_status
            WHERE change_status.resource_type = 'CAMPAIGN_BUDGET'
                AND change_status.last_change_date_time >= '${start}'
                AND change_status.last_change_date_time < '${end}'
            LIMIT 10000
        `;

        const changeStatusProxyConfig: ProxyConfiguration = {
            // https://developers.google.com/google-ads/api/docs/reporting/streaming
            endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
            method: 'POST',
            data: { query: changeStatusQuery },
            headers,
            retries: 3
        };

        const response = await nango.post(changeStatusProxyConfig);
        const rows = extractSearchStreamRows(response.data);
        const parseResult = z.array(ChangeStatusResultSchema).safeParse(rows);
        if (!parseResult.success) {
            throw new Error(`Failed to parse change_status rows: ${parseResult.error.message}`);
        }

        const result: ChangeStatusRow[] = [];
        for (const row of parseResult.data) {
            const cs = row.changeStatus;
            const resourceName = cs?.campaignBudget;
            if (!cs || !resourceName) {
                continue;
            }
            result.push({ status: cs.resourceStatus, resourceName, lastChangeDateTime: cs.lastChangeDateTime });
        }
        return result;
    };

    // change_status.last_change_date_time is reported in the account's own timezone, not UTC.
    // Walking one extra day past the UTC "now" watermark (while still checkpointing at the true,
    // unpadded value) absorbs that skew so a change that Google timestamps as being "ahead" of
    // UTC is never missed.
    for (const day of eachDayInclusive(updatedAfter, addDays(now, 1))) {
        await collectChangeStatusRows(fetchWindow, `${day} 00:00:00`, `${addDays(day, 1)} 00:00:00`, 0, changeMap);
    }

    const removedNames: string[] = [];
    const changedNames: string[] = [];

    for (const [resourceName, info] of changeMap) {
        if (info.resourceStatus === 'REMOVED') {
            removedNames.push(resourceName);
        } else {
            changedNames.push(resourceName);
        }
    }

    if (removedNames.length > 0) {
        await nango.batchDelete(
            removedNames.map((name) => ({ id: name })),
            'CampaignBudget'
        );
    }

    if (changedNames.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < changedNames.length; i += batchSize) {
            const batch = changedNames.slice(i, i + batchSize);
            const budgetQuery = `
                SELECT
                    campaign_budget.resource_name,
                    campaign_budget.id,
                    campaign_budget.amount_micros,
                    campaign_budget.explicitly_shared,
                    campaign_budget.status,
                    campaign_budget.name
                FROM campaign_budget
                WHERE campaign_budget.resource_name IN ('${batch.join("','")}')
            `;

            const budgetProxyConfig: ProxyConfiguration = {
                // https://developers.google.com/google-ads/api/docs/reporting/streaming
                endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                method: 'POST',
                data: { query: budgetQuery },
                headers,
                retries: 3
            };

            const response = await nango.post(budgetProxyConfig);
            const rows = extractSearchStreamRows(response.data);
            const parseResult = z.array(CampaignBudgetResultSchema).safeParse(rows);
            if (!parseResult.success) {
                throw new Error(`Failed to parse campaign budget refetch rows: ${parseResult.error.message}`);
            }

            const budgets = mapCampaignBudgetRows(parseResult.data);
            if (budgets.length > 0) {
                await nango.batchSave(budgets, 'CampaignBudget');
            }
        }
    }
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
