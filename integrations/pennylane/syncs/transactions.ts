import { createSync } from 'nango';
import { z } from 'zod';

const ChangelogEventSchema = z.object({
    id: z.number(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string()
});

const ChangelogResponseSchema = z.object({
    items: ChangelogEventSchema.array(),
    has_more: z.boolean(),
    next_cursor: z.string().optional().nullable()
});

const TransactionDataSchema = z.object({
    id: z.number(),
    label: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    amount: z.union([z.string(), z.number()]).optional().nullable(),
    currency: z.string().optional().nullable(),
    fee: z.union([z.string(), z.number()]).optional().nullable(),
    outstanding_balance: z.union([z.string(), z.number()]).optional().nullable(),
    archived_at: z.string().optional().nullable(),
    bank_account_id: z.number().optional().nullable(),
    journal_id: z.number().optional().nullable(),
    bank_account: z
        .object({
            id: z.number().optional().nullable(),
            url: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    journal: z
        .object({
            id: z.number().optional().nullable(),
            url: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    categories: z
        .array(
            z.object({
                id: z.number().optional().nullable(),
                source_id: z.string().optional().nullable(),
                label: z.string().optional().nullable(),
                weight: z.union([z.string(), z.number()]).optional().nullable()
            })
        )
        .optional()
        .nullable()
});

const WrappedTransactionResponseSchema = z.object({
    transaction: TransactionDataSchema
});

const TransactionSchema = z.object({
    id: z.string(),
    label: z.string().optional(),
    date: z.string().optional(),
    amount: z.string().optional(),
    currency: z.string().optional(),
    fee: z.string().optional(),
    outstanding_balance: z.string().optional(),
    archived_at: z.string().optional(),
    bank_account_id: z.number().optional(),
    journal_id: z.number().optional(),
    bank_account: z
        .object({
            id: z.number().optional(),
            url: z.string().optional()
        })
        .optional(),
    journal: z
        .object({
            id: z.number().optional(),
            url: z.string().optional()
        })
        .optional(),
    categories: z
        .array(
            z.object({
                id: z.number().optional(),
                source_id: z.string().optional(),
                label: z.string().optional(),
                weight: z.string().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    processed_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Continuously sync bank transactions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Transaction: TransactionSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { processed_after: '', cursor: '' };
        let cursor = checkpoint.cursor || undefined;
        const startDate = checkpoint.processed_after || undefined;
        let lastProcessedAt: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const params: Record<string, string | number> = { limit: 100 };
            if (cursor) {
                params['cursor'] = cursor;
            } else if (startDate) {
                params['start_date'] = startDate;
            }

            // https://pennylane.readme.io/reference/gettransactionchanges
            const response = await nango.get({
                endpoint: '/api/external/v2/changelogs/transactions',
                params,
                retries: 3
            });

            const parsed = ChangelogResponseSchema.parse(response.data);
            const events = parsed.items;

            const lastOperationById: Record<number, string> = {};
            for (const event of events) {
                lastOperationById[event.id] = event.operation;
            }

            const toDelete: Array<{ id: string }> = [];
            const toUpsert: Array<z.infer<typeof TransactionSchema>> = [];

            for (const [idStr, operation] of Object.entries(lastOperationById)) {
                const id = Number(idStr);
                if (operation === 'delete') {
                    toDelete.push({ id: String(id) });
                    continue;
                }

                // https://pennylane.readme.io/reference/gettransaction
                const transactionResponse = await nango.get({
                    endpoint: `/api/external/v2/transactions/${encodeURIComponent(String(id))}`,
                    retries: 3
                });

                const wrappedResult = WrappedTransactionResponseSchema.safeParse(transactionResponse.data);
                const transactionData = wrappedResult.success ? wrappedResult.data.transaction : TransactionDataSchema.parse(transactionResponse.data);

                const mapped: z.infer<typeof TransactionSchema> = {
                    id: String(transactionData.id),
                    ...(transactionData.label != null && { label: transactionData.label }),
                    ...(transactionData.date != null && { date: transactionData.date }),
                    ...(transactionData.amount != null && { amount: String(transactionData.amount) }),
                    ...(transactionData.currency != null && { currency: transactionData.currency }),
                    ...(transactionData.fee != null && { fee: String(transactionData.fee) }),
                    ...(transactionData.outstanding_balance != null && { outstanding_balance: String(transactionData.outstanding_balance) }),
                    ...(transactionData.archived_at != null && { archived_at: transactionData.archived_at }),
                    ...(transactionData.bank_account_id != null && { bank_account_id: transactionData.bank_account_id }),
                    ...(transactionData.journal_id != null && { journal_id: transactionData.journal_id }),
                    ...(transactionData.bank_account != null && {
                        bank_account: {
                            ...(transactionData.bank_account.id != null && { id: transactionData.bank_account.id }),
                            ...(transactionData.bank_account.url != null && { url: transactionData.bank_account.url })
                        }
                    }),
                    ...(transactionData.journal != null && {
                        journal: {
                            ...(transactionData.journal.id != null && { id: transactionData.journal.id }),
                            ...(transactionData.journal.url != null && { url: transactionData.journal.url })
                        }
                    }),
                    ...(transactionData.categories != null && {
                        categories: transactionData.categories
                            .filter((cat) => cat != null)
                            .map((cat) => ({
                                ...(cat.id != null && { id: cat.id }),
                                ...(cat.source_id != null && { source_id: cat.source_id }),
                                ...(cat.label != null && { label: cat.label }),
                                ...(cat.weight != null && { weight: String(cat.weight) })
                            }))
                    })
                };

                toUpsert.push(mapped);
            }

            if (toDelete.length > 0) {
                await nango.batchDelete(toDelete, 'Transaction');
            }

            if (toUpsert.length > 0) {
                await nango.batchSave(toUpsert, 'Transaction');
            }

            const lastEvent = events[events.length - 1];
            if (lastEvent) {
                lastProcessedAt = lastEvent.processed_at;
            }

            hasMore = parsed.has_more && parsed.next_cursor != null;

            if (hasMore) {
                cursor = parsed.next_cursor ?? undefined;

                await nango.saveCheckpoint({
                    processed_after: startDate || '',
                    cursor: cursor || ''
                });
            }
        }

        if (lastProcessedAt) {
            await nango.saveCheckpoint({ processed_after: lastProcessedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
