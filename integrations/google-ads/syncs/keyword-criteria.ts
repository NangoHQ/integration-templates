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

const CheckpointSchema = z.object({
    updated_after: z.string()
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
        resourceName: z.string(),
        resourceStatus: z.string(),
        lastChangeDateTime: z.string().optional()
    })
});

const DEFAULT_LOGIN_CUSTOMER_ID = '3608201627';

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

async function fetchKeywordCriteriaViaSearchStream(nango: NangoSyncLocal, customerId: string, loginCustomerId: string, developerToken: string, query: string) {
    // https://developers.google.com/google-ads/api/docs/reporting/streaming
    const proxyConfig: ProxyConfiguration = {
        // https://developers.google.com/google-ads/api/docs/reporting/streaming
        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
        method: 'POST',
        headers: {
            'developer-token': developerToken,
            'login-customer-id': loginCustomerId
        },
        data: {
            query
        },
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'pageToken',
            cursor_path_in_response: '0.nextPageToken',
            response_path: '0.results'
            // limit_name_in_request intentionally omitted: Google Ads API rejects pageSize in the JSON body
        },
        retries: 3
    };

    const criteria: z.infer<typeof KeywordCriterionSchema>[] = [];
    for await (const page of nango.paginate(proxyConfig)) {
        const parsed = z.array(SearchStreamResultSchema).safeParse(page);
        if (!parsed.success) {
            throw new Error(`Failed to parse SearchStream results: ${parsed.error.message}`);
        }
        for (const result of parsed.data) {
            const criterion = mapResultToKeywordCriterion(result);
            if (criterion) {
                criteria.push(criterion);
            }
        }
    }
    return criteria;
}

async function fetchChangeStatus(
    nango: NangoSyncLocal,
    customerId: string,
    loginCustomerId: string,
    developerToken: string,
    updatedAfter: string,
    now: string
) {
    // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
    const query = `
        SELECT
            change_status.resource_name,
            change_status.resource_status,
            change_status.last_change_date_time
        FROM change_status
        WHERE change_status.resource_type = AD_GROUP_CRITERION
            AND change_status.last_change_date_time > '${updatedAfter}'
            AND change_status.last_change_date_time < '${now}'
    `;

    const proxyConfig: ProxyConfiguration = {
        // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
        method: 'POST',
        headers: {
            'developer-token': developerToken,
            'login-customer-id': loginCustomerId
        },
        data: {
            query
        },
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'pageToken',
            cursor_path_in_response: '0.nextPageToken',
            response_path: '0.results'
            // limit_name_in_request intentionally omitted: Google Ads API rejects pageSize in the JSON body
        },
        retries: 3
    };

    const changes: z.infer<typeof ChangeStatusResultSchema>[] = [];
    for await (const page of nango.paginate(proxyConfig)) {
        const parsed = z.array(ChangeStatusResultSchema).safeParse(page);
        if (!parsed.success) {
            throw new Error(`Failed to parse change_status results: ${parsed.error.message}`);
        }
        changes.push(...parsed.data);
    }
    return changes;
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

        const loginCustomerId = parsedMetadata.data.login_customer_id ?? DEFAULT_LOGIN_CUSTOMER_ID;
        const developerToken = parsedMetadata.data.developer_token;

        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined;
        if (checkpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (parsedCheckpoint.success) {
                updatedAfter = parsedCheckpoint.data.updated_after;
            }
        }

        const now = new Date().toISOString();

        for (const customerId of customerIds) {
            if (!updatedAfter) {
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
                    WHERE ad_group_criterion.type = KEYWORD
                `;
                const criteria = await fetchKeywordCriteriaViaSearchStream(nango, customerId, loginCustomerId, developerToken, fullQuery);
                if (criteria.length > 0) {
                    await nango.batchSave(criteria, 'KeywordCriterion');
                }
            } else {
                const changes = await fetchChangeStatus(nango, customerId, loginCustomerId, developerToken, updatedAfter, now);

                const removed = changes
                    .filter((change) => change.changeStatus.resourceStatus === 'REMOVED')
                    .map((change) => ({ id: change.changeStatus.resourceName }));

                const changedResourceNames = changes
                    .filter((change) => change.changeStatus.resourceStatus === 'ADDED' || change.changeStatus.resourceStatus === 'CHANGED')
                    .map((change) => change.changeStatus.resourceName);

                if (removed.length > 0) {
                    await nango.batchDelete(removed, 'KeywordCriterion');
                }

                if (changedResourceNames.length > 0) {
                    const inClause = changedResourceNames.map((name) => `'${name}'`).join(',');
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
                        WHERE ad_group_criterion.type = KEYWORD
                            AND ad_group_criterion.resource_name IN (${inClause})
                    `;
                    const criteria = await fetchKeywordCriteriaViaSearchStream(nango, customerId, loginCustomerId, developerToken, refetchQuery);
                    if (criteria.length > 0) {
                        await nango.batchSave(criteria, 'KeywordCriterion');
                    }
                }
            }
        }

        await nango.saveCheckpoint({ updated_after: now });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
