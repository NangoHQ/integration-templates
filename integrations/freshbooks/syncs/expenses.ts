import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    accountId: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const _FreshBooksExpenseSchema = z.object({
    id: z.number(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    date: z.string().optional(),
    updated: z.string().optional(),
    staffid: z.number().optional(),
    categoryid: z.number().optional(),
    vis_state: z.number().optional(),
    vendor: z.string().optional(),
    notes: z.string().optional(),
    status: z.number().optional()
});

const ExpenseSchema = z.object({
    id: z.string(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    date: z.string().optional(),
    updated: z.string().optional(),
    staffid: z.number().optional(),
    categoryid: z.number().optional(),
    vis_state: z.number().optional(),
    vendor: z.string().optional(),
    notes: z.string().optional(),
    status: z.number().optional()
});

const sync = createSync({
    description: 'Sync expenses.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Expense: ExpenseSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        if (!metadata.accountId) {
            throw new Error('accountId is required in connection metadata');
        }

        const checkpoint = (await nango.getCheckpoint()) ?? { updated_after: '1970-01-01T00:00:00' };

        const params: Record<string, string | number> = {
            per_page: 100
        };

        if (checkpoint.updated_after !== '1970-01-01T00:00:00') {
            params['search[updated_since]'] = checkpoint.updated_after;
        }

        let maxUpdated: string | undefined;

        // https://www.freshbooks.com/api
        for await (const pageResults of nango.paginate<z.infer<typeof _FreshBooksExpenseSchema>>({
            endpoint: `/accounting/account/${encodeURIComponent(metadata.accountId)}/expenses/expenses`,
            params: {
                sort: 'updated:asc',
                ...params
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'response.result.expenses'
            },
            retries: 3
        })) {
            const expenses = [];

            for (const expense of pageResults) {
                expenses.push({
                    id: String(expense.id),
                    ...(expense.amount != null && { amount: expense.amount }),
                    ...(expense.date != null && { date: expense.date }),
                    ...(expense.updated != null && { updated: expense.updated }),
                    ...(expense.staffid != null && { staffid: expense.staffid }),
                    ...(expense.categoryid != null && { categoryid: expense.categoryid }),
                    ...(expense.vis_state != null && { vis_state: expense.vis_state }),
                    ...(expense.vendor != null && { vendor: expense.vendor }),
                    ...(expense.notes != null && { notes: expense.notes }),
                    ...(expense.status != null && { status: expense.status })
                });

                if (expense.updated) {
                    const formatted = expense.updated.replace(' ', 'T');
                    if (maxUpdated === undefined || formatted > maxUpdated) {
                        maxUpdated = formatted;
                    }
                }
            }

            if (expenses.length > 0) {
                await nango.batchSave(expenses, 'Expense');
            }
        }

        if (maxUpdated) {
            await nango.saveCheckpoint({
                updated_after: maxUpdated
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
