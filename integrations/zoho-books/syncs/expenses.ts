import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ExpenseSchema = z.object({
    id: z.string(),
    expense_id: z.string(),
    date: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    bcy_total: z.number().optional(),
    total: z.number().optional(),
    is_billable: z.boolean().optional(),
    reference_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    status: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const MetadataSchema = z.object({
    organization_id: z.string()
});

const sync = createSync({
    description: 'Sync expenses from Zoho Books.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/expenses' }],
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Expense: ExpenseSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (typeof metadata !== 'object' || metadata === null || !('organization_id' in metadata) || typeof metadata.organization_id !== 'string') {
            throw new Error('organization_id is required in metadata');
        }

        // Blocker: List Expenses documents pagination, filters, and sorting, but no
        // changed-since cursor or last_modified_time filter for incremental syncs.
        await nango.trackDeletesStart('Expense');

        const params: Record<string, string | number> = {
            organization_id: metadata.organization_id,
            sort_column: 'created_time'
        };

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/expenses
            endpoint: '/books/v3/expenses',
            params,
            paginate: {
                type: 'offset',
                response_path: 'expenses',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 200
            },
            retries: 3
        };

        for await (const page of nango.paginate<{
            expense_id: string;
            date?: string;
            account_name?: string;
            description?: string;
            currency_id?: string;
            currency_code?: string;
            bcy_total?: number;
            total?: number;
            is_billable?: boolean;
            reference_number?: string | null;
            customer_id?: string;
            customer_name?: string;
            status?: string;
            created_time?: string;
            last_modified_time?: string;
        }>(proxyConfig)) {
            if (page.length === 0) {
                continue;
            }

            const expenses = page.map((record) => {
                const mapped: z.infer<typeof ExpenseSchema> = {
                    id: record.expense_id,
                    expense_id: record.expense_id,
                    ...(record.date !== undefined && { date: record.date }),
                    ...(record.account_name !== undefined && { account_name: record.account_name }),
                    ...(record.description !== undefined && { description: record.description }),
                    ...(record.currency_id !== undefined && { currency_id: record.currency_id }),
                    ...(record.currency_code !== undefined && { currency_code: record.currency_code }),
                    ...(record.bcy_total !== undefined && { bcy_total: record.bcy_total }),
                    ...(record.total !== undefined && { total: record.total }),
                    ...(record.is_billable !== undefined && { is_billable: record.is_billable }),
                    ...(record.reference_number !== undefined && record.reference_number !== null && { reference_number: record.reference_number }),
                    ...(record.customer_id !== undefined && { customer_id: record.customer_id }),
                    ...(record.customer_name !== undefined && { customer_name: record.customer_name }),
                    ...(record.status !== undefined && { status: record.status }),
                    ...(record.created_time !== undefined && { created_time: record.created_time }),
                    ...(record.last_modified_time !== undefined && { last_modified_time: record.last_modified_time })
                };
                return mapped;
            });

            await nango.batchSave(expenses, 'Expense');
        }

        await nango.trackDeletesEnd('Expense');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
