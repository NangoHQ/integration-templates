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
function extractSearchStreamRows(data: unknown): unknown[] {
    if (Array.isArray(data)) {
        return data.flatMap((chunk: unknown) => {
            if (!isObject(chunk)) {
                return [];
            }
            const results = chunk['results'];
            return Array.isArray(results) ? results : [];
        });
    }
    if (isObject(data)) {
        const results = data['results'];
        if (Array.isArray(results)) {
            return results;
        }
    }
    return [];
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

// Walks [startStr, endStr] one calendar day at a time so a single change_status query window can
// never need to return more than a day's worth of changes, keeping each query well under the
// mandatory LIMIT 10000 for realistically sized accounts.
function* eachDayInclusive(startStr: string, endStr: string): Generator<string> {
    let current = startStr;
    let iterations = 0;
    while (current <= endStr && iterations < 3650) {
        yield current;
        current = addDays(current, 1);
        iterations++;
    }
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
        const initializedCustomerIds = new Set((checkpoint?.initialized_customer_ids ?? '').split(',').filter(Boolean));

        const headers: Record<string, string> = {
            'developer-token': developerToken
        };
        if (loginCustomerId) {
            headers['login-customer-id'] = loginCustomerId;
        }

        for (const customerId of customerIds) {
            const isNewAccount = !initializedCustomerIds.has(customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, now) >= CHANGE_STATUS_RETENTION_DAYS;
            const needsFullRefresh = !globalUpdatedAfter || isNewAccount || isStaleCheckpoint;

            if (needsFullRefresh) {
                await runFullFetch(nango, customerId, headers);
            } else {
                await runIncrementalFetch(nango, customerId, headers, globalUpdatedAfter, now);
            }

            initializedCustomerIds.add(customerId);
        }

        await nango.saveCheckpoint({ updated_after: now, initialized_customer_ids: [...initializedCustomerIds].join(',') });
    }
});

async function runFullFetch(nango: Parameters<(typeof sync)['exec']>[0], customerId: string, headers: Record<string, string>): Promise<void> {
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

    const budgets = mapCampaignBudgetRows(parseResult.data);
    if (budgets.length > 0) {
        await nango.batchSave(budgets, 'CampaignBudget');
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

    for (const day of eachDayInclusive(updatedAfter, now)) {
        const changeStatusQuery = `
            SELECT
                change_status.resource_type,
                change_status.resource_status,
                change_status.campaign_budget,
                change_status.last_change_date_time
            FROM change_status
            WHERE change_status.resource_type = 'CAMPAIGN_BUDGET'
                AND change_status.last_change_date_time >= '${day}'
                AND change_status.last_change_date_time <= '${day}'
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

        for (const row of parseResult.data) {
            const cs = row.changeStatus;
            const resourceName = cs?.campaignBudget;
            if (!cs || !resourceName) {
                continue;
            }
            const existing = changeMap.get(resourceName);
            if (!existing || cs.lastChangeDateTime > existing.lastChangeDateTime) {
                changeMap.set(resourceName, { resourceStatus: cs.resourceStatus, lastChangeDateTime: cs.lastChangeDateTime });
            }
        }
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
