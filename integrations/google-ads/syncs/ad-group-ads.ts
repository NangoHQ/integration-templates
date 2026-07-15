import { createSync } from 'nango';
import { z } from 'zod';

const AdGroupAdSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    ad_name: z.string().optional(),
    ad_type: z.string().optional(),
    ad_group: z.string().optional(),
    ad_group_name: z.string().optional(),
    campaign: z.string().optional(),
    campaign_name: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).optional(),
    login_customer_id: z.string().optional(),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ListAccessibleCustomersResponseSchema = z.object({
    resourceNames: z.array(z.string()).optional()
});

const SearchStreamChunkSchema = z.object({
    results: z.array(z.record(z.string(), z.unknown())).optional(),
    fieldMask: z.string().optional(),
    requestId: z.string().optional(),
    queryResourceConsumption: z.string().optional(),
    summaryRow: z.record(z.string(), z.unknown()).optional()
});

const SearchStreamResponseSchema = z.union([z.array(SearchStreamChunkSchema), SearchStreamChunkSchema]);

const ChangeStatusResultSchema = z.object({
    changeStatus: z
        .object({
            resourceName: z.string().optional(),
            lastChangeDateTime: z.string().optional(),
            resourceType: z.string().optional(),
            resourceStatus: z.string().optional(),
            adGroupAd: z.string().optional()
        })
        .optional()
});

const GoogleAdsErrorDetailSchema = z.object({
    errors: z
        .array(
            z.object({
                errorCode: z
                    .object({
                        authorizationError: z.string().optional()
                    })
                    .optional(),
                message: z.string().optional()
            })
        )
        .optional()
});

const GoogleAdsErrorPayloadSchema = z.object({
    error: z
        .object({
            details: z.array(GoogleAdsErrorDetailSchema).optional()
        })
        .optional()
});

const GoogleAdsErrorSchema = z.object({
    response: z
        .object({
            data: z.union([GoogleAdsErrorPayloadSchema, z.array(GoogleAdsErrorPayloadSchema)]).optional()
        })
        .optional()
});

const AdGroupAdResultSchema = z.object({
    adGroupAd: z
        .object({
            resourceName: z.string().optional(),
            status: z.string().optional(),
            ad: z
                .object({
                    name: z.string().optional(),
                    type: z.string().optional()
                })
                .optional(),
            adGroup: z.string().optional()
        })
        .optional(),
    adGroup: z
        .object({
            name: z.string().optional()
        })
        .optional(),
    campaign: z
        .object({
            resourceName: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

const sync = createSync({
    description: 'Sync ad group ads for customer accounts in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        AdGroupAd: AdGroupAdSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter =
            checkpoint && typeof checkpoint.updated_after === 'string'
                ? checkpoint.updated_after
                : toDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const updatedBefore = toDateString(new Date());

        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;

        let loginCustomerId = metadata.login_customer_id;

        if (!loginCustomerId) {
            const connection = await nango.getConnection();
            const connMeta = connection.metadata;
            if (connMeta && typeof connMeta['login_customer_id'] === 'string') {
                loginCustomerId = connMeta['login_customer_id'];
            }
        }

        let customerIds: string[] | undefined = metadata.customer_ids;
        if (!customerIds || customerIds.length === 0) {
            // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
            const accessibleResponse = await nango.get({
                endpoint: 'v21/customers:listAccessibleCustomers',
                headers: {
                    'developer-token': metadata.developer_token
                },
                retries: 3
            });

            const parsed = ListAccessibleCustomersResponseSchema.safeParse(accessibleResponse.data);
            if (!parsed.success) {
                throw new Error('Failed to parse listAccessibleCustomers response');
            }

            const resourceNames = parsed.data.resourceNames ?? [];
            customerIds = resourceNames.map((rn) => rn.replace('customers/', ''));
        }

        if (!customerIds || customerIds.length === 0) {
            throw new Error('No customer IDs found in metadata or accessible customers');
        }

        const adsToUpsert: z.infer<typeof AdGroupAdSchema>[] = [];
        const adsToDelete: { id: string }[] = [];

        for (const customerId of customerIds) {
            // @allowTryCatch Skipping customers that are not test accounts when using a test-only developer token.
            try {
                const changeStatusQuery = `
                SELECT
                    change_status.resource_name,
                    change_status.last_change_date_time,
                    change_status.resource_status,
                    change_status.ad_group_ad
                FROM change_status
                WHERE change_status.resource_type = 'AD_GROUP_AD'
                  AND change_status.last_change_date_time >= '${updatedAfter}'
                  AND change_status.last_change_date_time <= '${updatedBefore}'
                LIMIT 10000
            `;

                // https://developers.google.com/google-ads/api/docs/reporting/streaming
                const changeStatusResponse = await nango.post({
                    endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                    headers: {
                        'developer-token': metadata.developer_token,
                        ...(loginCustomerId && { 'login-customer-id': loginCustomerId })
                    },
                    data: { query: changeStatusQuery },
                    retries: 3
                });

                const changeParsed = SearchStreamResponseSchema.safeParse(changeStatusResponse.data);
                if (!changeParsed.success) {
                    throw new Error(`Failed to parse change_status searchStream response: ${JSON.stringify(changeStatusResponse.data)}`);
                }

                const changeChunks = Array.isArray(changeParsed.data) ? changeParsed.data : [changeParsed.data];
                const results: Record<string, unknown>[] = [];
                for (const chunk of changeChunks) {
                    if (chunk.results) {
                        results.push(...chunk.results);
                    }
                }

                const changeMap = new Map<string, string>();
                const changedResourceNames: string[] = [];

                for (const rawResult of results) {
                    const parsed = ChangeStatusResultSchema.safeParse(rawResult);
                    if (!parsed.success) {
                        throw new Error('Failed to parse individual change_status result');
                    }

                    const cs = parsed.data.changeStatus;
                    if (!cs) {
                        throw new Error('changeStatus object missing in change_status result');
                    }

                    const resourceName = cs.adGroupAd;
                    const status = cs.resourceStatus;
                    const lastChange = cs.lastChangeDateTime;

                    if (!resourceName) {
                        throw new Error('adGroupAd resource name missing in change_status result');
                    }

                    if (status === 'REMOVED') {
                        adsToDelete.push({ id: resourceName });
                    } else {
                        changedResourceNames.push(resourceName);
                        if (lastChange) {
                            changeMap.set(resourceName, lastChange);
                        }
                    }
                }

                const chunks = chunkArray(changedResourceNames, 1000);
                for (const chunk of chunks) {
                    const inClause = chunk.map((rn) => `'${rn}'`).join(', ');
                    const fetchQuery = `
                    SELECT
                        ad_group_ad.resource_name,
                        ad_group_ad.status,
                        ad_group_ad.ad.name,
                        ad_group_ad.ad.type,
                        ad_group_ad.ad_group,
                        ad_group.name,
                        campaign.resource_name,
                        campaign.name
                    FROM ad_group_ad
                    WHERE ad_group_ad.resource_name IN (${inClause})
                    LIMIT 10000
                `;

                    // https://developers.google.com/google-ads/api/docs/reporting/streaming
                    const fetchResponse = await nango.post({
                        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                        headers: {
                            'developer-token': metadata.developer_token,
                            ...(loginCustomerId && { 'login-customer-id': loginCustomerId })
                        },
                        data: { query: fetchQuery },
                        retries: 3
                    });

                    const fetchParsed = SearchStreamResponseSchema.safeParse(fetchResponse.data);
                    if (!fetchParsed.success) {
                        throw new Error(`Failed to parse ad_group_ad searchStream response: ${JSON.stringify(fetchResponse.data)}`);
                    }

                    const fetchChunks = Array.isArray(fetchParsed.data) ? fetchParsed.data : [fetchParsed.data];
                    const fetchResults: Record<string, unknown>[] = [];
                    for (const chunk of fetchChunks) {
                        if (chunk.results) {
                            fetchResults.push(...chunk.results);
                        }
                    }

                    for (const rawResult of fetchResults) {
                        const parsed = AdGroupAdResultSchema.safeParse(rawResult);
                        if (!parsed.success) {
                            throw new Error('Failed to parse individual ad_group_ad result');
                        }

                        const ad = parsed.data.adGroupAd;
                        const ag = parsed.data.adGroup;
                        const camp = parsed.data.campaign;

                        if (!ad?.resourceName) {
                            throw new Error('adGroupAd resourceName missing in fetch result');
                        }

                        const updatedAt = changeMap.get(ad.resourceName);

                        adsToUpsert.push({
                            id: ad.resourceName,
                            ...(ad.status !== undefined && { status: ad.status }),
                            ...(ad.ad?.name !== undefined && { ad_name: ad.ad.name }),
                            ...(ad.ad?.type !== undefined && { ad_type: ad.ad.type }),
                            ...(ad.adGroup !== undefined && { ad_group: ad.adGroup }),
                            ...(ag?.name !== undefined && { ad_group_name: ag.name }),
                            ...(camp?.resourceName !== undefined && { campaign: camp.resourceName }),
                            ...(camp?.name !== undefined && { campaign_name: camp.name }),
                            ...(updatedAt !== undefined && { updated_at: updatedAt })
                        });
                    }
                }
            } catch (rawError) {
                const parsed = GoogleAdsErrorSchema.safeParse(rawError);
                let authError: string | undefined;
                if (parsed.success) {
                    const data = parsed.data.response?.data;
                    const payload = Array.isArray(data) ? data[0] : data;
                    const details = payload?.error?.details;
                    if (details && details.length > 0) {
                        const errors = details[0]?.errors;
                        if (errors && errors.length > 0) {
                            authError = errors[0]?.errorCode?.authorizationError;
                        }
                    }
                }
                if (authError === 'DEVELOPER_TOKEN_NOT_APPROVED') {
                    continue;
                }
                throw rawError;
            }
        }

        if (adsToUpsert.length > 0) {
            await nango.batchSave(adsToUpsert, 'AdGroupAd');
        }

        if (adsToDelete.length > 0) {
            await nango.batchDelete(adsToDelete, 'AdGroupAd');
        }

        await nango.saveCheckpoint({
            updated_after: updatedBefore
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
