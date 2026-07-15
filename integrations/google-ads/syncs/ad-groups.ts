import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).optional(),
    login_customer_id: z.string().optional(),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

// Checkpoint values must be scalars (string/number/boolean); the set of initialized customer IDs
// is encoded as a comma-separated string rather than an array.
const CheckpointSchema = z.object({
    updated_after: z.string(),
    initialized_customer_ids: z.string()
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
            lastChangeDateTime: z.string().optional(),
            adGroup: z.string().optional()
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

function formatDate(date: Date): string {
    const iso = date.toISOString();
    return iso.slice(0, iso.indexOf('T'));
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

function addOneSecond(dateTimeStr: string): string {
    const date = parseDateTime(dateTimeStr);
    date.setUTCSeconds(date.getUTCSeconds() + 1);
    return formatDateTime(date);
}

// A single change_status query is capped at LIMIT 10000. A day that saturates that cap is split
// in half by time and re-queried recursively, so a high-churn day never silently loses changes
// beyond the first 10,000. If a window still saturates after MAX_CHANGE_STATUS_SPLIT_DEPTH splits
// (down to sub-second windows), we fail loudly instead of advancing the checkpoint past unseen
// changes.
const MAX_CHANGE_STATUS_SPLIT_DEPTH = 8;

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
                `change_status query saturated (>=10000 rows) for window ${startStr}..${endStr} even after ${depth} splits; refusing to advance the checkpoint to avoid silently dropping changes.`
            );
        }
        const mid = midpointDateTime(startStr, endStr);
        if (mid === startStr || mid === endStr) {
            throw new Error(`change_status window ${startStr}..${endStr} cannot be split further but is still saturated; refusing to advance the checkpoint.`);
        }
        await collectChangeStatusRows(fetchWindow, startStr, mid, depth + 1, sink);
        await collectChangeStatusRows(fetchWindow, addOneSecond(mid), endStr, depth + 1, sink);
        return;
    }
    for (const row of rows) {
        const existing = sink.get(row.resourceName);
        if (!existing || row.lastChangeDateTime > existing.lastChangeDateTime) {
            sink.set(row.resourceName, { status: row.status, lastChangeDateTime: row.lastChangeDateTime });
        }
    }
}

function mapStreamRowsToAdGroups(rawResults: unknown[]): Array<z.infer<typeof AdGroupSchema>> {
    const adGroups: Array<z.infer<typeof AdGroupSchema>> = [];
    for (const rawResult of rawResults) {
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
    return adGroups;
}

function extractCustomerId(resourceName: string): string | undefined {
    return resourceName.match(/^customers\/(\d+)\//)?.[1];
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

                // @allowTryCatch Skip accounts where the developer token is not approved; re-throw everything else.
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
                } catch (err) {
                    if (isDeveloperTokenNotApprovedError(err)) {
                        continue;
                    }
                    throw err;
                }
            }
        }

        const now = new Date();
        const globalUpdatedAfter = checkpoint?.updated_after;
        const queryUntil = formatDate(now);
        // Prune to accounts currently in scope: if an account was previously removed (from
        // metadata.customer_ids, or no longer discovered under the manager hierarchy) and is now
        // back, it must not be treated as already initialized — any changes made while it was out
        // of scope would otherwise be missed.
        const currentAccountIds = new Set(accountsToProcess.map((a) => a.customerId));
        const initializedCustomerIds = new Set(
            (checkpoint?.initialized_customer_ids ?? '')
                .split(',')
                .filter(Boolean)
                .filter((id) => currentAccountIds.has(id))
        );

        const accountNeedsFullRefresh = new Map<string, boolean>();
        for (const account of accountsToProcess) {
            const isNewAccount = !initializedCustomerIds.has(account.customerId);
            const isStaleCheckpoint = globalUpdatedAfter !== undefined && daysBetween(globalUpdatedAfter, queryUntil) >= CHANGE_STATUS_RETENTION_DAYS;
            accountNeedsFullRefresh.set(account.customerId, !globalUpdatedAfter || isNewAccount || isStaleCheckpoint);
        }

        // A full refresh only fetches currently-active ad groups; without this, anything removed
        // (or removed while the checkpoint was stale/uninitialized) would linger in the model
        // forever. Build a one-time map of previously-synced IDs per customer so each full-refresh
        // branch can delete whatever it no longer sees.
        const previousIdsByCustomer = new Map<string, Set<string>>();
        if ([...accountNeedsFullRefresh.values()].some(Boolean)) {
            for await (const record of nango.listRecords('AdGroup')) {
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

        for (const account of accountsToProcess) {
            const headers: Record<string, string> = {
                'developer-token': metadata.developer_token
            };
            if (account.loginCustomerId) {
                headers['login-customer-id'] = account.loginCustomerId;
            }

            const needsFullRefresh = accountNeedsFullRefresh.get(account.customerId) ?? true;

            if (needsFullRefresh) {
                // Full refresh: first run overall, a newly discovered/added account with no prior
                // history, or a checkpoint too old for change_status's 90-day retention window.
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

                const adGroups = mapStreamRowsToAdGroups(allResults);

                const previousIds = previousIdsByCustomer.get(account.customerId);
                if (previousIds) {
                    const currentIds = new Set(adGroups.map((g) => g.id));
                    const staleIds = [...previousIds].filter((id) => !currentIds.has(id));
                    if (staleIds.length > 0) {
                        await nango.batchDelete(
                            staleIds.map((id) => ({ id })),
                            'AdGroup'
                        );
                    }
                }

                if (adGroups.length > 0) {
                    await nango.batchSave(adGroups, 'AdGroup');
                }
            } else {
                // Incremental: query change_status for changed/removed ad groups, one calendar day
                // at a time; a saturated day is further split by time (see collectChangeStatusRows).
                if (!globalUpdatedAfter) {
                    throw new Error('Invariant violated: incremental path reached without a checkpoint.');
                }
                const updatedAfter = globalUpdatedAfter;
                const removedIds: string[] = [];
                const changedResourceNames: string[] = [];
                const changeSink = new Map<string, { status: string; lastChangeDateTime: string }>();

                const fetchWindow = async (start: string, end: string): Promise<ChangeStatusRow[]> => {
                    const changeStatusQuery =
                        "SELECT change_status.resource_status, change_status.last_change_date_time, change_status.ad_group FROM change_status WHERE change_status.resource_type = 'AD_GROUP' AND change_status.last_change_date_time >= '" +
                        start +
                        "' AND change_status.last_change_date_time <= '" +
                        end +
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

                    const rows: ChangeStatusRow[] = [];
                    for (const rawResult of changeResults) {
                        const result = ChangeStatusRowSchema.parse(rawResult);
                        const resourceName = result.changeStatus?.adGroup;
                        if (!resourceName) {
                            continue;
                        }
                        rows.push({
                            status: result.changeStatus?.resourceStatus ?? '',
                            resourceName,
                            lastChangeDateTime: result.changeStatus?.lastChangeDateTime ?? ''
                        });
                    }
                    return rows;
                };

                for (const day of eachDayInclusive(updatedAfter, queryUntil)) {
                    await collectChangeStatusRows(fetchWindow, `${day} 00:00:00`, `${day} 23:59:59`, 0, changeSink);
                }

                for (const [resourceName, info] of changeSink) {
                    if (info.status === 'REMOVED') {
                        removedIds.push(resourceName);
                    } else if (info.status === 'ADDED' || info.status === 'CHANGED') {
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

                    const adGroups = mapStreamRowsToAdGroups(refetchResults);
                    if (adGroups.length > 0) {
                        await nango.batchSave(adGroups, 'AdGroup');
                    }
                }
            }

            initializedCustomerIds.add(account.customerId);
        }

        await nango.saveCheckpoint({ updated_after: queryUntil, initialized_customer_ids: [...initializedCustomerIds].join(',') });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
