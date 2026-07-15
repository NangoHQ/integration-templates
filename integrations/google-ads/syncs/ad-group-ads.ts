import { createSync, type ProxyConfiguration } from 'nango';
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

const ListAccessibleCustomersResponseSchema = z.object({
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

const AdGroupAdRowSchema = z.object({
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

function isDeveloperTokenNotApprovedError(rawError: unknown): boolean {
    const parsed = GoogleAdsErrorSchema.safeParse(rawError);
    if (!parsed.success) {
        return false;
    }
    const data = parsed.data.response?.data;
    const payload = Array.isArray(data) ? data[0] : data;
    const details = payload?.error?.details;
    const authError = details?.[0]?.errors?.[0]?.errorCode?.authorizationError;
    return authError === 'DEVELOPER_TOKEN_NOT_APPROVED';
}

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

function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateOnly(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00.000Z`);
}

function addDays(dateStr: string, days: number): string {
    const date = parseDateOnly(dateStr);
    date.setUTCDate(date.getUTCDate() + days);
    return toDateString(date);
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

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

const FULL_FETCH_QUERY = `
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
`;

function mapAdGroupAdRows(rawResults: unknown[], updatedAt: string | undefined, changeMap?: Map<string, string>): Array<z.infer<typeof AdGroupAdSchema>> {
    const ads: Array<z.infer<typeof AdGroupAdSchema>> = [];
    for (const rawResult of rawResults) {
        const parsed = AdGroupAdRowSchema.safeParse(rawResult);
        if (!parsed.success) {
            throw new Error('Failed to parse individual ad_group_ad result');
        }
        const ad = parsed.data.adGroupAd;
        const ag = parsed.data.adGroup;
        const camp = parsed.data.campaign;
        if (!ad?.resourceName) {
            throw new Error('adGroupAd resourceName missing in fetch result');
        }
        ads.push({
            id: ad.resourceName,
            ...(ad.status !== undefined && { status: ad.status }),
            ...(ad.ad?.name !== undefined && { ad_name: ad.ad.name }),
            ...(ad.ad?.type !== undefined && { ad_type: ad.ad.type }),
            ...(ad.adGroup !== undefined && { ad_group: ad.adGroup }),
            ...(ag?.name !== undefined && { ad_group_name: ag.name }),
            ...(camp?.resourceName !== undefined && { campaign: camp.resourceName }),
            ...(camp?.name !== undefined && { campaign_name: camp.name }),
            ...((changeMap?.get(ad.resourceName) ?? updatedAt) !== undefined && { updated_at: changeMap?.get(ad.resourceName) ?? updatedAt })
        });
    }
    return ads;
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
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = checkpointResult && checkpointResult.success ? checkpointResult.data : null;
        const globalUpdatedAfter = checkpoint?.updated_after;
        const initializedCustomerIds = new Set((checkpoint?.initialized_customer_ids ?? '').split(',').filter(Boolean));
        const updatedBefore = toDateString(new Date());

        type Account = {
            customerId: string;
            loginCustomerId: string | undefined;
        };

        let accountsToProcess: Account[] = [];
        if (metadata.customer_ids && metadata.customer_ids.length > 0) {
            accountsToProcess = metadata.customer_ids.map((id) => ({
                customerId: id,
                loginCustomerId: metadata.login_customer_id
            }));
        } else {
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

            const accessibleIds = (parsed.data.resourceNames ?? []).map((rn) => rn.replace('customers/', ''));

            for (const accessibleId of accessibleIds) {
                // A manager account cannot itself be queried for ad_group_ad rows; resolve its
                // non-manager child accounts and query each leaf with the manager as login-customer-id.
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

                // @allowTryCatch Skip accounts where the developer token is not approved; re-throw everything else.
                try {
                    const clientResponse = await nango.post(clientConfig);
                    const clientData = z
                        .object({
                            results: z.array(z.unknown()).optional()
                        })
                        .parse(clientResponse.data);

                    let foundChildren = false;
                    for (const rawResult of clientData.results ?? []) {
                        const parsedRow = CustomerClientRowSchema.parse(rawResult);
                        if (parsedRow.customerClient?.id && parsedRow.customerClient?.manager === false) {
                            foundChildren = true;
                            accountsToProcess.push({
                                customerId: parsedRow.customerClient.id,
                                loginCustomerId: accessibleId
                            });
                        }
                    }
                    if (!foundChildren) {
                        // Not a manager account (or has no child accounts): treat it as a direct account.
                        accountsToProcess.push({ customerId: accessibleId, loginCustomerId: undefined });
                    }
                } catch (err) {
                    if (isDeveloperTokenNotApprovedError(err)) {
                        continue;
                    }
                    throw err;
                }
            }
        }

        const adsToUpsert: z.infer<typeof AdGroupAdSchema>[] = [];
        const adsToDelete: { id: string }[] = [];

        for (const account of accountsToProcess) {
            const headers: Record<string, string> = {
                'developer-token': metadata.developer_token,
                ...(account.loginCustomerId && { 'login-customer-id': account.loginCustomerId })
            };

            const isNewAccount = !initializedCustomerIds.has(account.customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, updatedBefore) >= CHANGE_STATUS_RETENTION_DAYS;
            const needsFullRefresh = !globalUpdatedAfter || isNewAccount || isStaleCheckpoint;

            // @allowTryCatch Skipping customers that are not test accounts when using a test-only developer token.
            try {
                if (needsFullRefresh) {
                    const fullResponse = await nango.post({
                        endpoint: `v21/customers/${encodeURIComponent(account.customerId)}/googleAds:searchStream`,
                        headers,
                        data: { query: FULL_FETCH_QUERY },
                        retries: 3
                    });
                    const rows = extractSearchStreamRows(fullResponse.data);
                    adsToUpsert.push(...mapAdGroupAdRows(rows, updatedBefore));
                } else {
                    const changeMap = new Map<string, string>();
                    const changedResourceNames: string[] = [];

                    for (const day of eachDayInclusive(globalUpdatedAfter, updatedBefore)) {
                        const changeStatusQuery = `
                            SELECT
                                change_status.resource_name,
                                change_status.last_change_date_time,
                                change_status.resource_status,
                                change_status.ad_group_ad
                            FROM change_status
                            WHERE change_status.resource_type = 'AD_GROUP_AD'
                              AND change_status.last_change_date_time >= '${day}'
                              AND change_status.last_change_date_time <= '${day}'
                            LIMIT 10000
                        `;

                        // https://developers.google.com/google-ads/api/docs/change-status
                        const changeStatusResponse = await nango.post({
                            endpoint: `v21/customers/${encodeURIComponent(account.customerId)}/googleAds:searchStream`,
                            headers,
                            data: { query: changeStatusQuery },
                            retries: 3
                        });

                        const results = extractSearchStreamRows(changeStatusResponse.data);
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
                            if (!resourceName) {
                                throw new Error('adGroupAd resource name missing in change_status result');
                            }
                            if (cs.resourceStatus === 'REMOVED') {
                                adsToDelete.push({ id: resourceName });
                            } else {
                                changedResourceNames.push(resourceName);
                                if (cs.lastChangeDateTime) {
                                    changeMap.set(resourceName, cs.lastChangeDateTime);
                                }
                            }
                        }
                    }

                    for (const chunk of chunkArray(changedResourceNames, 1000)) {
                        const inClause = chunk.map((rn) => `'${rn}'`).join(', ');
                        const fetchQuery = `${FULL_FETCH_QUERY} WHERE ad_group_ad.resource_name IN (${inClause}) LIMIT 10000`;

                        const fetchResponse = await nango.post({
                            endpoint: `v21/customers/${encodeURIComponent(account.customerId)}/googleAds:searchStream`,
                            headers,
                            data: { query: fetchQuery },
                            retries: 3
                        });

                        const fetchResults = extractSearchStreamRows(fetchResponse.data);
                        adsToUpsert.push(...mapAdGroupAdRows(fetchResults, undefined, changeMap));
                    }
                }
            } catch (rawError) {
                if (isDeveloperTokenNotApprovedError(rawError)) {
                    continue;
                }
                throw rawError;
            }

            initializedCustomerIds.add(account.customerId);
        }

        if (adsToUpsert.length > 0) {
            await nango.batchSave(adsToUpsert, 'AdGroupAd');
        }

        if (adsToDelete.length > 0) {
            await nango.batchDelete(adsToDelete, 'AdGroupAd');
        }

        await nango.saveCheckpoint({
            updated_after: updatedBefore,
            initialized_customer_ids: [...initializedCustomerIds].join(',')
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
