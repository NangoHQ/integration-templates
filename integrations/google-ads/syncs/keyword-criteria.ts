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

async function fetchChangeStatusForDay(nango: NangoSyncLocal, customerId: string, headers: Record<string, string>, day: string) {
    const query = `
        SELECT
            change_status.resource_status,
            change_status.last_change_date_time,
            change_status.ad_group_criterion
        FROM change_status
        WHERE change_status.resource_type = 'AD_GROUP_CRITERION'
            AND change_status.last_change_date_time >= '${day}'
            AND change_status.last_change_date_time <= '${day}'
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
    return parsed.data;
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
        const initializedCustomerIds = new Set(
            (parsedCheckpoint && parsedCheckpoint.success ? (parsedCheckpoint.data.initialized_customer_ids ?? '') : '').split(',').filter(Boolean)
        );

        const now = formatDate(new Date());

        for (const customerId of customerIds) {
            const isNewAccount = !initializedCustomerIds.has(customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, now) >= CHANGE_STATUS_RETENTION_DAYS;
            const needsFullRefresh = !globalUpdatedAfter || isNewAccount || isStaleCheckpoint;

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
                if (criteria.length > 0) {
                    await nango.batchSave(criteria, 'KeywordCriterion');
                }
            } else {
                const removed: Array<{ id: string }> = [];
                const changedResourceNames: string[] = [];

                for (const day of eachDayInclusive(globalUpdatedAfter, now)) {
                    const changes = await fetchChangeStatusForDay(nango, customerId, headers, day);

                    for (const change of changes) {
                        const resourceName = change.changeStatus.adGroupCriterion;
                        if (!resourceName) {
                            continue;
                        }
                        if (change.changeStatus.resourceStatus === 'REMOVED') {
                            removed.push({ id: resourceName });
                        } else if (change.changeStatus.resourceStatus === 'ADDED' || change.changeStatus.resourceStatus === 'CHANGED') {
                            changedResourceNames.push(resourceName);
                        }
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
