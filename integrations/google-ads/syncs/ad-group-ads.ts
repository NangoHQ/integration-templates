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
//
// Throws on a genuinely unrecognized envelope shape rather than silently degrading to an empty
// result, so a malformed/unexpected response can never be misread as "there is nothing here" —
// which, combined with full-refresh deletion reconciliation, could otherwise purge every
// previously-synced ad for a customer based on a bad response.
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

function toDateString(date: Date): string {
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
    return toDateString(date);
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
        const rawInitializedCustomerIds = new Set((checkpoint?.initialized_customer_ids ?? '').split(',').filter(Boolean));
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
                // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
                let foundChildren = false;
                let clientPageToken: string | undefined;

                // @allowTryCatch Skip accounts where the developer token is not approved; re-throw everything else.
                try {
                    do {
                        const clientConfig: ProxyConfiguration = {
                            // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
                            endpoint: `v21/customers/${encodeURIComponent(accessibleId)}/googleAds:search`,
                            method: 'POST',
                            headers: {
                                'developer-token': metadata.developer_token
                            },
                            data: {
                                query: 'SELECT customer_client.id, customer_client.manager FROM customer_client WHERE customer_client.manager = FALSE',
                                ...(clientPageToken && { pageToken: clientPageToken })
                            },
                            retries: 3
                        };

                        const clientResponse = await nango.post(clientConfig);
                        const clientData = z
                            .object({
                                results: z.array(z.unknown()).optional(),
                                nextPageToken: z.string().optional()
                            })
                            .parse(clientResponse.data);

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

                        clientPageToken = clientData.nextPageToken;
                    } while (clientPageToken);

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

        // Prune to accounts currently in scope: if an account was previously removed (from
        // metadata.customer_ids, or no longer discovered under the manager hierarchy) and is now
        // back, it must not be treated as already initialized — any changes made while it was out
        // of scope would otherwise be missed.
        const currentAccountIds = new Set(accountsToProcess.map((a) => a.customerId));
        const initializedCustomerIds = new Set([...rawInitializedCustomerIds].filter((id) => currentAccountIds.has(id)));

        const accountNeedsFullRefresh = new Map<string, boolean>();
        for (const account of accountsToProcess) {
            const isNewAccount = !initializedCustomerIds.has(account.customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, updatedBefore) >= CHANGE_STATUS_RETENTION_DAYS;
            accountNeedsFullRefresh.set(account.customerId, !globalUpdatedAfter || isNewAccount || isStaleCheckpoint);
        }

        // A full refresh only fetches ads currently returned by ad_group_ad (including REMOVED
        // ones, which must be deleted rather than upserted); without reconciling against what was
        // previously synced, anything removed while the checkpoint was stale/uninitialized would
        // linger in the model forever. Build a one-time map of previously-synced IDs per customer
        // so each full-refresh branch can delete whatever it no longer sees as active.
        const previousIdsByCustomer = new Map<string, Set<string>>();
        if ([...accountNeedsFullRefresh.values()].some(Boolean)) {
            for await (const record of nango.listRecords('AdGroupAd')) {
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

        const adsToUpsert: z.infer<typeof AdGroupAdSchema>[] = [];
        const adsToDelete: { id: string }[] = [];

        for (const account of accountsToProcess) {
            const headers: Record<string, string> = {
                'developer-token': metadata.developer_token,
                ...(account.loginCustomerId && { 'login-customer-id': account.loginCustomerId })
            };

            const needsFullRefresh = accountNeedsFullRefresh.get(account.customerId) ?? true;

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
                    const mapped = mapAdGroupAdRows(rows, updatedBefore);
                    const activeAds = mapped.filter((ad) => ad.status !== 'REMOVED');
                    const removedIds = mapped.filter((ad) => ad.status === 'REMOVED').map((ad) => ad.id);

                    const previousIds = previousIdsByCustomer.get(account.customerId);
                    const activeIds = new Set(activeAds.map((ad) => ad.id));

                    // A previously-known ad can be both REMOVED in this fetch and absent from
                    // `previousIds`'s "active" complement — dedupe via a Set so it's only queued
                    // for deletion once.
                    const idsToDelete = new Set(removedIds);
                    if (previousIds) {
                        for (const id of previousIds) {
                            if (!activeIds.has(id)) {
                                idsToDelete.add(id);
                            }
                        }
                    }

                    adsToDelete.push(...[...idsToDelete].map((id) => ({ id })));
                    adsToUpsert.push(...activeAds);
                } else {
                    if (!globalUpdatedAfter) {
                        throw new Error('Invariant violated: incremental path reached without a checkpoint.');
                    }
                    const updatedAfter = globalUpdatedAfter;
                    const changeSink = new Map<string, { status: string; lastChangeDateTime: string }>();

                    const fetchWindow = async (start: string, end: string): Promise<ChangeStatusRow[]> => {
                        const changeStatusQuery = `
                            SELECT
                                change_status.resource_name,
                                change_status.last_change_date_time,
                                change_status.resource_status,
                                change_status.ad_group_ad
                            FROM change_status
                            WHERE change_status.resource_type = 'AD_GROUP_AD'
                              AND change_status.last_change_date_time >= '${start}'
                              AND change_status.last_change_date_time < '${end}'
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
                        const rows: ChangeStatusRow[] = [];
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
                            rows.push({ status: cs.resourceStatus ?? '', resourceName, lastChangeDateTime: cs.lastChangeDateTime ?? '' });
                        }
                        return rows;
                    };

                    // change_status.last_change_date_time is reported in the account's own
                    // timezone, not UTC. Walking one extra day past the UTC "now" watermark
                    // (while still checkpointing at the true, unpadded value) absorbs that skew
                    // so a change that Google timestamps as being "ahead" of UTC is never missed.
                    for (const day of eachDayInclusive(updatedAfter, addDays(updatedBefore, 1))) {
                        await collectChangeStatusRows(fetchWindow, `${day} 00:00:00`, `${addDays(day, 1)} 00:00:00`, 0, changeSink);
                    }

                    const changeMap = new Map<string, string>();
                    const changedResourceNames: string[] = [];
                    for (const [resourceName, info] of changeSink) {
                        if (info.status === 'REMOVED') {
                            adsToDelete.push({ id: resourceName });
                        } else {
                            changedResourceNames.push(resourceName);
                            if (info.lastChangeDateTime) {
                                changeMap.set(resourceName, info.lastChangeDateTime);
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
