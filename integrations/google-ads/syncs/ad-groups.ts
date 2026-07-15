import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).optional(),
    login_customer_id: z.string().optional(),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const AdGroupSchema = z.object({
    id: z.string(),
    resource_name: z.string(),
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    cpc_bid_micros: z.string().optional(),
    cpm_bid_micros: z.string().optional(),
    target_cpa_micros: z.string().optional(),
    target_roas: z.number().optional(),
    tracking_url_template: z.string().optional(),
    final_url_suffix: z.string().optional()
});

const SearchStreamRowSchema = z.object({
    campaign: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    adGroup: z.object({
        resourceName: z.string(),
        id: z.string(),
        name: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        cpcBidMicros: z.string().optional(),
        cpmBidMicros: z.string().optional(),
        targetCpaMicros: z.string().optional(),
        targetRoas: z.number().optional(),
        trackingUrlTemplate: z.string().optional(),
        finalUrlSuffix: z.string().optional()
    })
});

const SearchStreamResponseSchema = z.union([
    z.array(z.object({ results: z.array(z.unknown()).optional() })),
    z.object({ results: z.array(z.unknown()).optional() })
]);

const ChangeStatusRowSchema = z.object({
    changeStatus: z
        .object({
            resourceStatus: z.string().optional(),
            lastChangeDateTime: z.string().optional()
        })
        .optional(),
    adGroup: z
        .object({
            resourceName: z.string().optional()
        })
        .optional()
});

const AccessibleCustomersResponseSchema = z.object({
    resourceNames: z.array(z.string()).optional()
});

const CustomerClientRowSchema = z.object({
    customerClient: z
        .object({
            id: z.string().optional(),
            manager: z.boolean().optional()
        })
        .optional()
});

function formatDate(date: Date): string {
    const iso = date.toISOString();
    return iso.slice(0, iso.indexOf('T'));
}

const sync = createSync({
    description: 'Sync ad groups for customer accounts in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        AdGroup: AdGroupSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = checkpointResult && checkpointResult.success ? checkpointResult.data : null;

        const customerIds = metadata.customer_ids ?? [];
        const loginCustomerId = metadata.login_customer_id;

        type Account = {
            customerId: string;
            loginCustomerId: string | undefined;
        };

        let accountsToProcess: Account[] = [];
        if (customerIds.length > 0) {
            accountsToProcess = customerIds.map((id) => ({
                customerId: id,
                loginCustomerId: loginCustomerId
            }));
        } else {
            const listConfig: ProxyConfiguration = {
                // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
                endpoint: 'v21/customers:listAccessibleCustomers',
                headers: {
                    'developer-token': metadata.developer_token
                },
                retries: 3
            };
            const accessibleResponse = await nango.get(listConfig);
            const accessible = AccessibleCustomersResponseSchema.parse(accessibleResponse.data);
            const accessibleIds = (accessible.resourceNames ?? []).map((name) => name.replace('customers/', ''));

            for (const accessibleId of accessibleIds) {
                const clientConfig: ProxyConfiguration = {
                    // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
                    endpoint: `v21/customers/${encodeURIComponent(accessibleId)}/googleAds:search`,
                    method: 'POST',
                    headers: {
                        'developer-token': metadata.developer_token
                    },
                    data: {
                        query: 'SELECT customer_client.id, customer_client.manager FROM customer_client WHERE customer_client.manager = FALSE'
                    },
                    retries: 3
                };

                // @allowTryCatch Skip accounts where the developer token is not approved
                try {
                    const clientResponse = await nango.post(clientConfig);
                    const clientData = z
                        .object({
                            results: z.array(z.unknown()).optional()
                        })
                        .parse(clientResponse.data);

                    for (const rawResult of clientData.results ?? []) {
                        const parsed = CustomerClientRowSchema.parse(rawResult);
                        if (parsed.customerClient?.id && parsed.customerClient?.manager === false) {
                            accountsToProcess.push({
                                customerId: parsed.customerClient.id,
                                loginCustomerId: accessibleId
                            });
                        }
                    }
                } catch (_err) {
                    // Intentionally skip accounts that reject the developer token
                }
            }
        }

        const now = new Date();
        const updatedAfter = checkpoint?.updated_after;
        const queryUntil = formatDate(now);

        for (const account of accountsToProcess) {
            const headers: Record<string, string> = {
                'developer-token': metadata.developer_token
            };
            if (account.loginCustomerId) {
                headers['login-customer-id'] = account.loginCustomerId;
            }

            if (!updatedAfter) {
                // Full refresh on first run
                const streamConfig: ProxyConfiguration = {
                    // https://developers.google.com/google-ads/api/docs/reporting/streaming
                    endpoint: `v21/customers/${encodeURIComponent(account.customerId)}/googleAds:searchStream`,
                    method: 'POST',
                    headers,
                    data: {
                        query: 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.cpc_bid_micros, ad_group.cpm_bid_micros, ad_group.target_cpa_micros, ad_group.target_roas, ad_group.tracking_url_template, ad_group.final_url_suffix, ad_group.resource_name FROM ad_group'
                    },
                    retries: 3
                };

                const streamResponse = await nango.post(streamConfig);
                const streamData = SearchStreamResponseSchema.parse(streamResponse.data);
                const chunks = Array.isArray(streamData) ? streamData : [streamData];
                const allResults = chunks.flatMap((chunk) => chunk.results ?? []);

                const adGroups = [];
                for (const rawResult of allResults) {
                    const result = SearchStreamRowSchema.parse(rawResult);
                    if (result.adGroup.status === 'REMOVED') {
                        continue;
                    }
                    adGroups.push({
                        id: result.adGroup.resourceName,
                        resource_name: result.adGroup.resourceName,
                        campaign_id: result.campaign?.id,
                        campaign_name: result.campaign?.name,
                        name: result.adGroup.name,
                        status: result.adGroup.status,
                        type: result.adGroup.type,
                        cpc_bid_micros: result.adGroup.cpcBidMicros,
                        cpm_bid_micros: result.adGroup.cpmBidMicros,
                        target_cpa_micros: result.adGroup.targetCpaMicros,
                        target_roas: result.adGroup.targetRoas,
                        tracking_url_template: result.adGroup.trackingUrlTemplate,
                        final_url_suffix: result.adGroup.finalUrlSuffix
                    });
                }

                if (adGroups.length > 0) {
                    await nango.batchSave(adGroups, 'AdGroup');
                }
            } else {
                // Incremental: query change_status for changed/removed ad groups
                const lowerBound = updatedAfter;
                const upperBound = queryUntil;

                const changeStatusQuery =
                    "SELECT change_status.resource_status, change_status.last_change_date_time, ad_group.resource_name FROM change_status WHERE change_status.resource_type = 'AD_GROUP' AND change_status.last_change_date_time >= '" +
                    lowerBound +
                    "' AND change_status.last_change_date_time <= '" +
                    upperBound +
                    "' LIMIT 10000";

                const changeStatusConfig: ProxyConfiguration = {
                    // https://developers.google.com/google-ads/api/docs/change-status
                    endpoint: `v21/customers/${encodeURIComponent(account.customerId)}/googleAds:searchStream`,
                    method: 'POST',
                    headers,
                    data: { query: changeStatusQuery },
                    retries: 3
                };

                const changeResponse = await nango.post(changeStatusConfig);
                const changeData = SearchStreamResponseSchema.parse(changeResponse.data);
                const changeChunks = Array.isArray(changeData) ? changeData : [changeData];
                const changeResults = changeChunks.flatMap((chunk) => chunk.results ?? []);

                const removedIds: string[] = [];
                const changedResourceNames: string[] = [];

                for (const rawResult of changeResults) {
                    const result = ChangeStatusRowSchema.parse(rawResult);
                    const status = result.changeStatus?.resourceStatus;
                    const resourceName = result.adGroup?.resourceName;

                    if (!resourceName) {
                        continue;
                    }

                    if (status === 'REMOVED') {
                        removedIds.push(resourceName);
                    } else if (status === 'ADDED' || status === 'CHANGED') {
                        changedResourceNames.push(resourceName);
                    }
                }

                if (removedIds.length > 0) {
                    await nango.batchDelete(
                        removedIds.map((id) => ({ id })),
                        'AdGroup'
                    );
                }

                if (changedResourceNames.length > 0) {
                    const inClause = changedResourceNames.map((rn) => `'${rn}'`).join(', ');
                    const refetchQuery =
                        'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.cpc_bid_micros, ad_group.cpm_bid_micros, ad_group.target_cpa_micros, ad_group.target_roas, ad_group.tracking_url_template, ad_group.final_url_suffix, ad_group.resource_name FROM ad_group WHERE ad_group.resource_name IN (' +
                        inClause +
                        ')';

                    const refetchConfig: ProxyConfiguration = {
                        // https://developers.google.com/google-ads/api/docs/reporting/streaming
                        endpoint: `v21/customers/${encodeURIComponent(account.customerId)}/googleAds:searchStream`,
                        method: 'POST',
                        headers,
                        data: { query: refetchQuery },
                        retries: 3
                    };

                    const refetchResponse = await nango.post(refetchConfig);
                    const refetchData = SearchStreamResponseSchema.parse(refetchResponse.data);
                    const refetchChunks = Array.isArray(refetchData) ? refetchData : [refetchData];
                    const refetchResults = refetchChunks.flatMap((chunk) => chunk.results ?? []);

                    const adGroups = [];
                    for (const rawResult of refetchResults) {
                        const result = SearchStreamRowSchema.parse(rawResult);
                        if (result.adGroup.status === 'REMOVED') {
                            continue;
                        }
                        adGroups.push({
                            id: result.adGroup.resourceName,
                            resource_name: result.adGroup.resourceName,
                            campaign_id: result.campaign?.id,
                            campaign_name: result.campaign?.name,
                            name: result.adGroup.name,
                            status: result.adGroup.status,
                            type: result.adGroup.type,
                            cpc_bid_micros: result.adGroup.cpcBidMicros,
                            cpm_bid_micros: result.adGroup.cpmBidMicros,
                            target_cpa_micros: result.adGroup.targetCpaMicros,
                            target_roas: result.adGroup.targetRoas,
                            tracking_url_template: result.adGroup.trackingUrlTemplate,
                            final_url_suffix: result.adGroup.finalUrlSuffix
                        });
                    }

                    if (adGroups.length > 0) {
                        await nango.batchSave(adGroups, 'AdGroup');
                    }
                }
            }
        }

        await nango.saveCheckpoint({ updated_after: queryUntil });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
