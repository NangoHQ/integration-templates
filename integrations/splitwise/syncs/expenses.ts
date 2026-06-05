import { createSync } from 'nango';
import { z } from 'zod';

const ProviderExpenseSchema = z.object({
    id: z.number(),
    cost: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    details: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    repeat_interval: z.string().nullable().optional(),
    currency_code: z.string().nullable().optional(),
    category_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional(),
    friendship_id: z.number().nullable().optional(),
    expense_bundle_id: z.number().nullable().optional(),
    repeats: z.boolean().nullable().optional(),
    email_reminder: z.boolean().nullable().optional(),
    email_reminder_in_advance: z.union([z.string(), z.number()]).nullable().optional(),
    next_repeat: z.string().nullable().optional(),
    comments_count: z.number().nullable().optional(),
    payment: z.boolean().nullable().optional(),
    transaction_confirmed: z.boolean().nullable().optional(),
    repayments: z
        .array(
            z.object({
                from: z.number(),
                to: z.number(),
                amount: z.string()
            })
        )
        .nullable()
        .optional(),
    created_at: z.string().nullable().optional(),
    created_by: z.record(z.string(), z.unknown()).nullable().optional(),
    updated_at: z.string().nullable().optional(),
    updated_by: z.record(z.string(), z.unknown()).nullable().optional(),
    deleted_at: z.string().nullable().optional(),
    deleted_by: z.record(z.string(), z.unknown()).nullable().optional(),
    category: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .nullable()
        .optional(),
    receipt: z
        .object({
            large: z.string().nullable().optional(),
            original: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    users: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    comments: z.array(z.record(z.string(), z.unknown())).nullable().optional()
});

const ExpenseSchema = z.object({
    id: z.string(),
    cost: z.string().optional(),
    description: z.string().optional(),
    details: z.string().optional(),
    date: z.string().optional(),
    repeat_interval: z.string().optional(),
    currency_code: z.string().optional(),
    category_id: z.number().optional(),
    group_id: z.number().optional(),
    friendship_id: z.number().optional(),
    expense_bundle_id: z.number().optional(),
    repeats: z.boolean().optional(),
    email_reminder: z.boolean().optional(),
    email_reminder_in_advance: z.string().optional(),
    next_repeat: z.string().optional(),
    comments_count: z.number().optional(),
    payment: z.boolean().optional(),
    transaction_confirmed: z.boolean().optional(),
    repayments: z
        .array(
            z.object({
                from: z.number(),
                to: z.number(),
                amount: z.string()
            })
        )
        .optional(),
    created_at: z.string().optional(),
    created_by: z.record(z.string(), z.unknown()).optional(),
    updated_at: z.string().optional(),
    updated_by: z.record(z.string(), z.unknown()).optional(),
    deleted_at: z.string().optional(),
    deleted_by: z.record(z.string(), z.unknown()).optional(),
    category: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .optional(),
    receipt: z
        .object({
            large: z.string().optional(),
            original: z.string().optional()
        })
        .optional(),
    users: z.array(z.record(z.string(), z.unknown())).optional(),
    comments: z.array(z.record(z.string(), z.unknown())).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync expenses from Splitwise.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/expenses' }],
    models: {
        Expense: ExpenseSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let maxUpdatedAt: string | undefined;

        const params: Record<string, string | number> = {
            limit: 5
        };
        if (checkpoint?.['updated_after']) {
            params['updated_after'] = checkpoint['updated_after'];
        }

        // https://dev.splitwise.com/#tag/expenses/paths/~1get_expenses/get
        for await (const page of nango.paginate({
            endpoint: '/api/v3.0/get_expenses',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 5,
                response_path: 'expenses'
            },
            retries: 3
        })) {
            if (!Array.isArray(page)) {
                throw new Error('Expected expenses array from paginate');
            }

            const parsedPage = z.array(ProviderExpenseSchema).parse(page);
            if (parsedPage.length === 0) {
                continue;
            }

            const upserts: z.infer<typeof ExpenseSchema>[] = [];
            const deletions: { id: string }[] = [];

            for (const record of parsedPage) {
                if (record.deleted_at) {
                    deletions.push({ id: String(record.id) });
                } else {
                    upserts.push({
                        id: String(record.id),
                        ...(record.cost != null && { cost: record.cost }),
                        ...(record.description != null && { description: record.description }),
                        ...(record.details != null && { details: record.details }),
                        ...(record.date != null && { date: record.date }),
                        ...(record.repeat_interval != null && { repeat_interval: record.repeat_interval }),
                        ...(record.currency_code != null && { currency_code: record.currency_code }),
                        ...(record.category_id != null && { category_id: record.category_id }),
                        ...(record.group_id != null && { group_id: record.group_id }),
                        ...(record.friendship_id != null && { friendship_id: record.friendship_id }),
                        ...(record.expense_bundle_id != null && { expense_bundle_id: record.expense_bundle_id }),
                        ...(record.repeats != null && { repeats: record.repeats }),
                        ...(record.email_reminder != null && { email_reminder: record.email_reminder }),
                        ...(record.email_reminder_in_advance != null && {
                            email_reminder_in_advance: String(record.email_reminder_in_advance)
                        }),
                        ...(record.next_repeat != null && { next_repeat: record.next_repeat }),
                        ...(record.comments_count != null && { comments_count: record.comments_count }),
                        ...(record.payment != null && { payment: record.payment }),
                        ...(record.transaction_confirmed != null && { transaction_confirmed: record.transaction_confirmed }),
                        ...(record.repayments != null && { repayments: record.repayments }),
                        ...(record.created_at != null && { created_at: record.created_at }),
                        ...(record.created_by != null && { created_by: record.created_by }),
                        ...(record.updated_at != null && { updated_at: record.updated_at }),
                        ...(record.updated_by != null && { updated_by: record.updated_by }),
                        ...(record.deleted_by != null && { deleted_by: record.deleted_by }),
                        ...(record.category != null && { category: record.category }),
                        ...(record.receipt != null && {
                            receipt: {
                                ...(record.receipt.large != null && { large: record.receipt.large }),
                                ...(record.receipt.original != null && { original: record.receipt.original })
                            }
                        }),
                        ...(record.users != null && { users: record.users }),
                        ...(record.comments != null && { comments: record.comments })
                    });
                }

                const recordTimestamp = record.updated_at || record.deleted_at || record.created_at;
                if (recordTimestamp) {
                    if (!maxUpdatedAt || recordTimestamp > maxUpdatedAt) {
                        maxUpdatedAt = recordTimestamp;
                    }
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Expense');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Expense');
            }

            if (maxUpdatedAt) {
                await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
