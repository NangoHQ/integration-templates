import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).min(1),
    login_customer_id: z.string(),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

// Checkpoint values must be scalars (string/number/boolean); the set of initialized customer IDs
// is encoded as a comma-separated string rather than an array.
const CheckpointSchema = z.object({
    updated_after: z.string(),
    initialized_customer_ids: z.string()
});

const CampaignSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    advertisingChannelType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    containsEuPoliticalAdvertising: z.string().optional(),
    campaignBudgetResourceName: z.string().optional(),
    budgetAmountMicros: z.string().optional().nullable(),
    budgetStatus: z.string().optional()
});

const ProviderCampaignRowSchema = z.object({
    campaign: z.object({
        resourceName: z.string(),
        id: z.string(),
        name: z.string(),
        status: z.string(),
        advertisingChannelType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        campaignBudget: z.string().optional(),
        containsEuPoliticalAdvertising: z.string().optional()
    }),
    campaignBudget: z
        .object({
            resourceName: z.string().optional(),
            amountMicros: z.string().optional().nullable(),
            status: z.string().optional()
        })
        .optional()
});

const ProviderChangeStatusRowSchema = z.object({
    changeStatus: z.object({
        resourceName: z.string(),
        lastChangeDateTime: z.string(),
        resourceStatus: z.string(),
        campaign: z.string().optional()
    })
});

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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

// Walks [startStr, endStr] one calendar day at a time so each change_status window starts no
// larger than a day; a saturated day is further split by time (see collectChangeStatusRows).
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
    sink: Map<string, { status: string; lastChangeDateTime: string }>
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
            sink.set(row.resourceName, { status: row.status, lastChangeDateTime: row.lastChangeDateTime });
        }
    }
}

function extractCustomerId(resourceName: string): string | undefined {
    return resourceName.match(/^customers\/(\d+)\//)?.[1];
}

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

const sync = createSync({
    description: 'Sync campaigns for customer accounts in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;
        if (!metadata.customer_ids.length) {
            throw new Error('customer_ids is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = checkpointResult && checkpointResult.success ? checkpointResult.data : null;
        const globalUpdatedAfter = checkpoint?.updated_after;
        const currentCustomerIds = new Set(metadata.customer_ids);
        // Prune to customers currently in scope: if a customer was previously removed from
        // metadata.customer_ids and is now added back, it must not be treated as already
        // initialized — any changes made while it was out of scope would otherwise be missed.
        const initializedCustomerIds = new Set(
            (checkpoint?.initialized_customer_ids ?? '')
                .split(',')
                .filter(Boolean)
                .filter((id) => currentCustomerIds.has(id))
        );
        const now = formatDate(new Date());

        async function searchStream(customerId: string, loginCustomerId: string, query: string): Promise<unknown[]> {
            // https://developers.google.com/google-ads/api/docs/reporting/streaming
            const response = await nango.post({
                endpoint: `/v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                headers: {
                    'developer-token': metadata.developer_token,
                    'login-customer-id': loginCustomerId
                },
                data: {
                    query
                },
                retries: 3
            });
            return extractSearchStreamRows(response.data);
        }

        function parseCampaignRows(rows: unknown[]): Array<z.infer<typeof CampaignSchema>> {
            const campaigns: Array<z.infer<typeof CampaignSchema>> = [];
            for (const row of rows) {
                const parsed = ProviderCampaignRowSchema.safeParse(row);
                if (!parsed.success) {
                    throw new Error(`Failed to parse campaign row: ${parsed.error.message}`);
                }
                const { campaign, campaignBudget } = parsed.data;
                campaigns.push({
                    id: campaign.resourceName,
                    name: campaign.name,
                    status: campaign.status,
                    advertisingChannelType: campaign.advertisingChannelType,
                    startDate: campaign.startDate,
                    endDate: campaign.endDate,
                    containsEuPoliticalAdvertising: campaign.containsEuPoliticalAdvertising,
                    campaignBudgetResourceName: campaignBudget?.resourceName,
                    budgetAmountMicros: campaignBudget?.amountMicros ?? null,
                    budgetStatus: campaignBudget?.status
                });
            }
            return campaigns;
        }

        const fullQuery = `
SELECT
  campaign.resource_name,
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign.start_date,
  campaign.end_date,
  campaign.campaign_budget,
  campaign.contains_eu_political_advertising,
  campaign_budget.resource_name,
  campaign_budget.amount_micros,
  campaign_budget.status
FROM campaign
WHERE campaign.status != 'REMOVED'
`;

        const customerNeedsFullRefresh = new Map<string, boolean>();
        for (const customerId of metadata.customer_ids) {
            const isNewAccount = !initializedCustomerIds.has(customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, now) >= CHANGE_STATUS_RETENTION_DAYS;
            customerNeedsFullRefresh.set(customerId, !globalUpdatedAfter || isNewAccount || isStaleCheckpoint);
        }

        // A full refresh only fetches currently-active campaigns; without this, anything removed
        // (or removed while the checkpoint was stale/uninitialized) would linger in the model
        // forever. Build a one-time map of previously-synced IDs per customer so each full-refresh
        // branch can delete whatever it no longer sees.
        const previousIdsByCustomer = new Map<string, Set<string>>();
        if ([...customerNeedsFullRefresh.values()].some(Boolean)) {
            for await (const record of nango.listRecords('Campaign')) {
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

        for (const customerId of metadata.customer_ids) {
            const needsFullRefresh = customerNeedsFullRefresh.get(customerId) ?? true;

            if (needsFullRefresh) {
                const rows = await searchStream(customerId, metadata.login_customer_id, fullQuery);
                const campaigns = parseCampaignRows(rows);

                const previousIds = previousIdsByCustomer.get(customerId);
                if (previousIds) {
                    const currentIds = new Set(campaigns.map((c) => c.id));
                    const staleIds = [...previousIds].filter((id) => !currentIds.has(id));
                    if (staleIds.length > 0) {
                        await nango.batchDelete(
                            staleIds.map((id) => ({ id })),
                            'Campaign'
                        );
                    }
                }

                if (campaigns.length > 0) {
                    await nango.batchSave(campaigns, 'Campaign');
                }
            } else {
                if (!globalUpdatedAfter) {
                    throw new Error('Invariant violated: incremental path reached without a checkpoint.');
                }
                const updatedAfter = globalUpdatedAfter;
                const removed: string[] = [];
                const changed: string[] = [];
                const changeSink = new Map<string, { status: string; lastChangeDateTime: string }>();

                const fetchWindow = async (start: string, end: string): Promise<ChangeStatusRow[]> => {
                    const changeQuery = `
SELECT
  change_status.resource_name,
  change_status.last_change_date_time,
  change_status.resource_status,
  change_status.campaign
FROM change_status
WHERE change_status.resource_type = 'CAMPAIGN'
  AND change_status.last_change_date_time >= '${start}'
  AND change_status.last_change_date_time < '${end}'
LIMIT 10000
`;
                    const changeRows = await searchStream(customerId, metadata.login_customer_id, changeQuery);
                    const rows: ChangeStatusRow[] = [];
                    for (const row of changeRows) {
                        const parsed = ProviderChangeStatusRowSchema.safeParse(row);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse change_status row: ${parsed.error.message}`);
                        }
                        const cs = parsed.data.changeStatus;
                        if (cs.campaign) {
                            rows.push({ status: cs.resourceStatus, resourceName: cs.campaign, lastChangeDateTime: cs.lastChangeDateTime });
                        }
                    }
                    return rows;
                };

                // change_status.last_change_date_time is reported in the account's own timezone,
                // not UTC. Walking one extra day past the UTC "now" watermark (while still
                // checkpointing at the true, unpadded value) absorbs that skew so a change that
                // Google timestamps as being "ahead" of UTC is never missed.
                for (const day of eachDayInclusive(updatedAfter, addDays(now, 1))) {
                    await collectChangeStatusRows(fetchWindow, `${day} 00:00:00`, `${addDays(day, 1)} 00:00:00`, 0, changeSink);
                }

                for (const [resourceName, info] of changeSink) {
                    if (info.status === 'REMOVED') {
                        removed.push(resourceName);
                    } else if (info.status === 'ADDED' || info.status === 'CHANGED') {
                        changed.push(resourceName);
                    }
                }

                if (removed.length > 0) {
                    await nango.batchDelete(
                        removed.map((id) => ({ id })),
                        'Campaign'
                    );
                }

                if (changed.length > 0) {
                    const resourceNames = changed.map((name) => `'${name}'`).join(',');
                    const refetchQuery = `
SELECT
  campaign.resource_name,
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign.start_date,
  campaign.end_date,
  campaign.campaign_budget,
  campaign.contains_eu_political_advertising,
  campaign_budget.resource_name,
  campaign_budget.amount_micros,
  campaign_budget.status
FROM campaign
WHERE campaign.resource_name IN (${resourceNames})
  AND campaign.status != 'REMOVED'
`;
                    const rows = await searchStream(customerId, metadata.login_customer_id, refetchQuery);
                    const campaigns = parseCampaignRows(rows);
                    if (campaigns.length > 0) {
                        await nango.batchSave(campaigns, 'Campaign');
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
