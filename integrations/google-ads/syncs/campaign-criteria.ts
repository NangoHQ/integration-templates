import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    customerIds: z.array(z.string()),
    loginCustomerId: z.string().optional(),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

// Checkpoint values must be scalars (string/number/boolean); the set of initialized customer IDs
// is encoded as a comma-separated string rather than an array.
const CheckpointSchema = z.object({
    updated_after: z.string(),
    initialized_customer_ids: z.string()
});

const CampaignCriterionSchema = z.object({
    id: z.string(),
    resourceName: z.string(),
    campaignId: z.string(),
    type: z.string().optional(),
    negative: z.boolean().optional(),
    keywordText: z.string().optional(),
    keywordMatchType: z.string().optional(),
    geoTargetConstant: z.string().optional()
});

const GoogleAdsRowSchema = z.object({
    campaignCriterion: z
        .object({
            resourceName: z.string(),
            type: z.string().optional(),
            negative: z.boolean().optional(),
            keyword: z
                .object({
                    text: z.string().optional(),
                    matchType: z.string().optional()
                })
                .optional(),
            location: z
                .object({
                    geoTargetConstant: z.string().optional()
                })
                .optional()
        })
        .optional(),
    changeStatus: z
        .object({
            campaignCriterion: z.string().optional(),
            resourceName: z.string().optional(),
            resourceStatus: z.string().optional(),
            resourceType: z.string().optional(),
            lastChangeDateTime: z.string().optional()
        })
        .optional()
});

const SearchResponseSchema = z.object({
    results: z.array(GoogleAdsRowSchema).optional(),
    nextPageToken: z.string().optional()
});

function buildHeaders(metadata: z.infer<typeof MetadataSchema>): Record<string, string> {
    const headers: Record<string, string> = {
        'developer-token': metadata.developerToken
    };
    if (metadata.loginCustomerId) {
        headers['login-customer-id'] = metadata.loginCustomerId;
    }
    return headers;
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
// never need to return more than a day's worth of changes, keeping each day's query (even with
// page-token pagination) well under the mandatory LIMIT 10000 for realistically sized accounts.
function* eachDayInclusive(startStr: string, endStr: string): Generator<string> {
    let current = startStr;
    let iterations = 0;
    while (current <= endStr && iterations < 3650) {
        yield current;
        current = addDays(current, 1);
        iterations++;
    }
}

function extractCampaignId(resourceName: string): string {
    const parts = resourceName.split('/');
    const lastPart = parts[parts.length - 1];
    if (!lastPart) {
        throw new Error('Invalid resourceName format');
    }
    const campaignId = lastPart.split('~')[0];
    if (!campaignId) {
        throw new Error('Invalid resourceName format');
    }
    return campaignId;
}

function mapRowToCampaignCriterion(row: z.infer<typeof GoogleAdsRowSchema>): z.infer<typeof CampaignCriterionSchema> {
    const cc = row.campaignCriterion;
    if (!cc) {
        throw new Error('Missing campaignCriterion in row');
    }
    return {
        id: cc.resourceName,
        resourceName: cc.resourceName,
        campaignId: extractCampaignId(cc.resourceName),
        ...(cc.type !== undefined && { type: cc.type }),
        ...(cc.negative !== undefined && { negative: cc.negative }),
        ...(cc.keyword?.text !== undefined && { keywordText: cc.keyword.text }),
        ...(cc.keyword?.matchType !== undefined && { keywordMatchType: cc.keyword.matchType }),
        ...(cc.location?.geoTargetConstant !== undefined && { geoTargetConstant: cc.location.geoTargetConstant })
    };
}

const sync = createSync({
    description: 'Sync campaign-level criteria (negative keywords and location targeting) for customer accounts in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        CampaignCriterion: CampaignCriterionSchema
    },

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.parse(metadataRaw);
        if (metadata.customerIds.length === 0) {
            throw new Error('customerIds is required in metadata');
        }

        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw ? CheckpointSchema.parse(checkpointRaw) : undefined;
        const globalUpdatedAfter = checkpoint?.updated_after;
        const initializedCustomerIds = new Set((checkpoint?.initialized_customer_ids ?? '').split(',').filter(Boolean));
        const queryUntil = formatDate(new Date());

        for (const customerId of metadata.customerIds) {
            const headers = buildHeaders(metadata);

            const isNewAccount = !initializedCustomerIds.has(customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, queryUntil) >= CHANGE_STATUS_RETENTION_DAYS;
            const needsFullRefresh = !globalUpdatedAfter || isNewAccount || isStaleCheckpoint;

            if (!needsFullRefresh) {
                const changedResourceNames: string[] = [];
                const removedResourceNames: string[] = [];

                for (const day of eachDayInclusive(globalUpdatedAfter, queryUntil)) {
                    let csPageToken: string | undefined;
                    do {
                        const csQuery = `SELECT
                            change_status.campaign_criterion,
                            change_status.resource_status,
                            change_status.resource_type,
                            change_status.last_change_date_time
                        FROM change_status
                        WHERE change_status.resource_type = 'CAMPAIGN_CRITERION'
                            AND change_status.last_change_date_time >= '${day}'
                            AND change_status.last_change_date_time <= '${day}'
                        LIMIT 10000`;

                        const csConfig: ProxyConfiguration = {
                            // https://developers.google.com/google-ads/api/docs/reporting/streaming
                            endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:search`,
                            data: {
                                query: csQuery,
                                ...(csPageToken && { pageToken: csPageToken })
                            },
                            headers,
                            retries: 3
                        };

                        const csResponse = await nango.post(csConfig);
                        const csParsed = SearchResponseSchema.parse(csResponse.data);
                        const csResults = csParsed.results ?? [];

                        for (const row of csResults) {
                            const status = row.changeStatus?.resourceStatus;
                            const name = row.changeStatus?.campaignCriterion;
                            if (!name) {
                                throw new Error('Missing campaignCriterion in change_status row');
                            }
                            if (status === 'REMOVED') {
                                removedResourceNames.push(name);
                            } else if (status === 'ADDED' || status === 'CHANGED') {
                                changedResourceNames.push(name);
                            }
                        }

                        csPageToken = csParsed.nextPageToken;
                    } while (csPageToken);
                }

                if (changedResourceNames.length > 0) {
                    const batchSize = 1000;
                    for (let i = 0; i < changedResourceNames.length; i += batchSize) {
                        const batch = changedResourceNames.slice(i, i + batchSize);
                        const inClause = batch.map((name) => `'${name}'`).join(',');

                        let fetchPageToken: string | undefined;
                        do {
                            const fetchQuery = `SELECT
                                campaign_criterion.resource_name,
                                campaign_criterion.type,
                                campaign_criterion.negative,
                                campaign_criterion.keyword.text,
                                campaign_criterion.keyword.match_type,
                                campaign_criterion.location.geo_target_constant
                            FROM campaign_criterion
                            WHERE campaign_criterion.resource_name IN (${inClause})
                                AND campaign_criterion.type IN ('KEYWORD', 'LOCATION')`;

                            const fetchConfig: ProxyConfiguration = {
                                // https://developers.google.com/google-ads/api/docs/reporting/streaming
                                endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:search`,
                                data: {
                                    query: fetchQuery,
                                    ...(fetchPageToken && { pageToken: fetchPageToken })
                                },
                                headers,
                                retries: 3
                            };

                            const fetchResponse = await nango.post(fetchConfig);
                            const fetchParsed = SearchResponseSchema.parse(fetchResponse.data);
                            const fetchResults = fetchParsed.results ?? [];

                            const criteria = fetchResults.map(mapRowToCampaignCriterion);
                            if (criteria.length > 0) {
                                await nango.batchSave(criteria, 'CampaignCriterion');
                            }

                            fetchPageToken = fetchParsed.nextPageToken;
                        } while (fetchPageToken);
                    }
                }

                if (removedResourceNames.length > 0) {
                    await nango.batchDelete(
                        removedResourceNames.map((name) => ({ id: name })),
                        'CampaignCriterion'
                    );
                }
            } else {
                let pageToken: string | undefined;
                do {
                    const query = `SELECT
                        campaign_criterion.resource_name,
                        campaign_criterion.type,
                        campaign_criterion.negative,
                        campaign_criterion.keyword.text,
                        campaign_criterion.keyword.match_type,
                        campaign_criterion.location.geo_target_constant
                    FROM campaign_criterion
                    WHERE campaign_criterion.type IN ('KEYWORD', 'LOCATION')`;

                    const config: ProxyConfiguration = {
                        // https://developers.google.com/google-ads/api/docs/reporting/streaming
                        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:search`,
                        data: {
                            query,
                            ...(pageToken && { pageToken })
                        },
                        headers,
                        retries: 3
                    };

                    const response = await nango.post(config);
                    const parsed = SearchResponseSchema.parse(response.data);
                    const results = parsed.results ?? [];

                    const criteria = results.map(mapRowToCampaignCriterion);
                    if (criteria.length > 0) {
                        await nango.batchSave(criteria, 'CampaignCriterion');
                    }

                    pageToken = parsed.nextPageToken;
                } while (pageToken);
            }

            initializedCustomerIds.add(customerId);
        }

        await nango.saveCheckpoint({
            updated_after: queryUntil,
            initialized_customer_ids: [...initializedCustomerIds].join(',')
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
