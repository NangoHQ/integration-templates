import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    organization_id: z.string()
});

const ProviderChartOfAccountSchema = z.object({
    account_id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional(),
    account_type: z.string(),
    is_user_created: z.boolean().optional(),
    is_system_account: z.boolean().optional(),
    is_standalone_account: z.boolean().optional(),
    is_active: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    current_balance: z.number().nullish(),
    parent_account_id: z.string().optional(),
    parent_account_name: z.string().optional(),
    depth: z.union([z.string(), z.number()]).optional(),
    has_attachment: z.boolean().optional(),
    is_child_present: z.boolean().optional(),
    child_count: z.union([z.string(), z.number()]).optional(),
    documents: z.array(z.string()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const ChartOfAccountSchema = z.object({
    id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional(),
    account_type: z.string(),
    is_user_created: z.boolean().optional(),
    is_system_account: z.boolean().optional(),
    is_standalone_account: z.boolean().optional(),
    is_active: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    current_balance: z.number().optional(),
    parent_account_id: z.string().optional(),
    parent_account_name: z.string().optional(),
    depth: z.string().optional(),
    has_attachment: z.boolean().optional(),
    is_child_present: z.boolean().optional(),
    child_count: z.string().optional(),
    documents: z.array(z.string()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const CheckpointSchema = z.object({
    last_modified_time: z.string()
});

const sync = createSync({
    description: 'Sync chart of accounts from Zoho Books',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        ChartOfAccount: ChartOfAccountSchema
    },
    // https://www.zoho.com/books/api/v3/chart-of-accounts/#list-chart-of-accounts
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/chart-of-accounts'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);

        if (!metadata.organization_id) {
            throw new Error('organization_id is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { last_modified_time: '' };
        let maxLastModifiedTime = checkpoint.last_modified_time;

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/chart-of-accounts/#list-chart-of-accounts
            endpoint: '/books/v3/chartofaccounts',
            params: {
                organization_id: metadata.organization_id,
                ...(checkpoint.last_modified_time && { last_modified_time: checkpoint.last_modified_time })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'chartofaccounts'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const accounts: z.infer<typeof ChartOfAccountSchema>[] = [];

            for (const item of page) {
                const record = ProviderChartOfAccountSchema.parse(item);

                accounts.push({
                    id: record.account_id,
                    account_name: record.account_name,
                    account_type: record.account_type,
                    ...(record.account_code != null && { account_code: record.account_code }),
                    ...(record.is_user_created != null && { is_user_created: record.is_user_created }),
                    ...(record.is_system_account != null && { is_system_account: record.is_system_account }),
                    ...(record.is_standalone_account != null && { is_standalone_account: record.is_standalone_account }),
                    ...(record.is_active != null && { is_active: record.is_active }),
                    ...(record.can_show_in_ze != null && { can_show_in_ze: record.can_show_in_ze }),
                    ...(record.is_involved_in_transaction != null && { is_involved_in_transaction: record.is_involved_in_transaction }),
                    ...(record.current_balance != null && { current_balance: record.current_balance }),
                    ...(record.parent_account_id != null && { parent_account_id: record.parent_account_id }),
                    ...(record.parent_account_name != null && { parent_account_name: record.parent_account_name }),
                    ...(record.depth != null && { depth: String(record.depth) }),
                    ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
                    ...(record.is_child_present != null && { is_child_present: record.is_child_present }),
                    ...(record.child_count != null && { child_count: String(record.child_count) }),
                    ...(record.documents != null && { documents: record.documents }),
                    ...(record.created_time != null && { created_time: record.created_time }),
                    ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time })
                });
            }

            if (accounts.length === 0) {
                continue;
            }

            await nango.batchSave(accounts, 'ChartOfAccount');

            for (const account of accounts) {
                if (account.last_modified_time != null && account.last_modified_time > maxLastModifiedTime) {
                    maxLastModifiedTime = account.last_modified_time;
                }
            }

            if (maxLastModifiedTime !== checkpoint.last_modified_time) {
                await nango.saveCheckpoint({
                    last_modified_time: maxLastModifiedTime
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
