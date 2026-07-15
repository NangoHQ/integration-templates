import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).min(1).describe('Google Ads customer IDs to sync campaign budgets for'),
    login_customer_id: z.string().optional().describe('Manager account ID for API access hierarchy'),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page_token: z.string()
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
            resourceName: z.string(),
            lastChangeDateTime: z.string()
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

        const checkpoint = await nango.getCheckpoint();
        const now = new Date().toISOString();
        const updatedAfter = typeof checkpoint?.updated_after === 'string' && checkpoint.updated_after ? checkpoint.updated_after : undefined;
        const pageTokenFromCheckpoint = typeof checkpoint?.page_token === 'string' && checkpoint.page_token ? checkpoint.page_token : undefined;

        const headers: Record<string, string> = {
            'developer-token': developerToken
        };
        if (loginCustomerId) {
            headers['login-customer-id'] = loginCustomerId;
        }

        for (const customerId of customerIds) {
            if (!updatedAfter) {
                await runFullFetch(nango, customerId, headers, now, pageTokenFromCheckpoint);
            } else {
                await runIncrementalFetch(nango, customerId, headers, updatedAfter, now);
            }
        }
    }
});

async function runFullFetch(
    nango: Parameters<(typeof sync)['exec']>[0],
    customerId: string,
    headers: Record<string, string>,
    now: string,
    resumePageToken: string | undefined
): Promise<void> {
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

    let nextPageToken: string | undefined = resumePageToken;

    const proxyConfig: ProxyConfiguration = {
        // https://developers.google.com/google-ads/api/docs/reporting/streaming
        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
        method: 'POST',
        data: {
            query: fullQuery,
            ...(nextPageToken && { pageToken: nextPageToken })
        },
        headers,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'pageToken',
            cursor_path_in_response: 'nextPageToken',
            response_path: 'results',
            on_page: async ({ nextPageParam }) => {
                nextPageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
            }
        },
        retries: 3
    };

    for await (const page of nango.paginate(proxyConfig)) {
        const parseResult = z.array(CampaignBudgetResultSchema).safeParse(page);
        if (!parseResult.success) {
            throw new Error(`Failed to parse campaign budget page: ${parseResult.error.message}`);
        }

        const budgets: Array<{
            id: string;
            resourceName: string;
            amountMicros?: string;
            explicitlyShared?: boolean;
            status?: string;
            name?: string;
        }> = [];

        for (const row of parseResult.data) {
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

        if (budgets.length > 0) {
            await nango.batchSave(budgets, 'CampaignBudget');
        }

        if (nextPageToken) {
            await nango.saveCheckpoint({ page_token: nextPageToken, updated_after: '' });
        }
    }

    await nango.saveCheckpoint({ updated_after: now, page_token: '' });
}

async function runIncrementalFetch(
    nango: Parameters<(typeof sync)['exec']>[0],
    customerId: string,
    headers: Record<string, string>,
    updatedAfter: string,
    now: string
): Promise<void> {
    const changeStatusQuery = `
        SELECT
            change_status.resource_type,
            change_status.resource_status,
            change_status.resource_name,
            change_status.last_change_date_time
        FROM change_status
        WHERE change_status.resource_type = 'CAMPAIGN_BUDGET'
            AND change_status.last_change_date_time > '${updatedAfter}'
            AND change_status.last_change_date_time < '${now}'
    `;

    const changeStatuses: Array<{ resourceType: string; resourceStatus: string; resourceName: string; lastChangeDateTime: string }> = [];

    const changeStatusProxyConfig: ProxyConfiguration = {
        // https://developers.google.com/google-ads/api/docs/reporting/streaming
        endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
        method: 'POST',
        data: { query: changeStatusQuery },
        headers,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'pageToken',
            cursor_path_in_response: 'nextPageToken',
            response_path: 'results'
        },
        retries: 3
    };

    for await (const page of nango.paginate(changeStatusProxyConfig)) {
        const parseResult = z.array(ChangeStatusResultSchema).safeParse(page);
        if (!parseResult.success) {
            throw new Error(`Failed to parse change_status page: ${parseResult.error.message}`);
        }

        for (const row of parseResult.data) {
            if (row.changeStatus) {
                changeStatuses.push(row.changeStatus);
            }
        }
    }

    const changeMap = new Map<string, { resourceStatus: string; lastChangeDateTime: string }>();
    for (const cs of changeStatuses) {
        const existing = changeMap.get(cs.resourceName);
        if (!existing || cs.lastChangeDateTime > existing.lastChangeDateTime) {
            changeMap.set(cs.resourceName, { resourceStatus: cs.resourceStatus, lastChangeDateTime: cs.lastChangeDateTime });
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
        const budgetQuery = `
            SELECT
                campaign_budget.resource_name,
                campaign_budget.id,
                campaign_budget.amount_micros,
                campaign_budget.explicitly_shared,
                campaign_budget.status,
                campaign_budget.name
            FROM campaign_budget
            WHERE campaign_budget.resource_name IN ('${changedNames.join("','")}')
        `;

        const budgetProxyConfig: ProxyConfiguration = {
            // https://developers.google.com/google-ads/api/docs/reporting/streaming
            endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
            method: 'POST',
            data: { query: budgetQuery },
            headers,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(budgetProxyConfig)) {
            const parseResult = z.array(CampaignBudgetResultSchema).safeParse(page);
            if (!parseResult.success) {
                throw new Error(`Failed to parse campaign budget refetch page: ${parseResult.error.message}`);
            }

            const budgets: Array<{
                id: string;
                resourceName: string;
                amountMicros?: string;
                explicitlyShared?: boolean;
                status?: string;
                name?: string;
            }> = [];

            for (const row of parseResult.data) {
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

            if (budgets.length > 0) {
                await nango.batchSave(budgets, 'CampaignBudget');
            }
        }
    }

    await nango.saveCheckpoint({ updated_after: now, page_token: '' });
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
