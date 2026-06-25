import { createSync } from 'nango';
import { z } from 'zod';

const TransactionSchema = z.object({
    id: z.string().describe('EntryID'),
    entryNumber: z.number().int().optional(),
    date: z.string().optional(),
    modified: z.string().optional(),
    journalCode: z.string().optional(),
    status: z.number().int().optional(),
    type: z.number().int().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        CurrentDivision: z.number().int().optional(),
        results: z
            .array(
                z.object({
                    CurrentDivision: z.number().int()
                })
            )
            .optional()
    })
});

const TransactionItemSchema = z.object({
    EntryID: z.string(),
    EntryNumber: z.number().int().nullish(),
    Date: z.string().nullish(),
    Modified: z.string().nullish(),
    JournalCode: z.string().nullish(),
    Status: z.number().int().nullish(),
    Type: z.number().int().nullish()
});

const sync = createSync({
    description: 'Sync financial transaction headers with date-window checkpoints',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Transaction: TransactionSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/financial-transactions'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = parsedCheckpoint.success ? parsedCheckpoint.data.updated_after : undefined;

        // https://start.exactonline.fr/docs/api/v1/current/Me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const parsedMe = MeResponseSchema.safeParse(meResponse.data);
        if (!parsedMe.success) {
            throw new Error('Failed to parse Me response for CurrentDivision');
        }

        const d = parsedMe.data.d;
        let division: number | undefined;
        if (d.CurrentDivision !== undefined) {
            division = d.CurrentDivision;
        }

        if (division === undefined && d.results !== undefined) {
            const firstResult = d.results[0];
            if (firstResult !== undefined) {
                division = firstResult.CurrentDivision;
            }
        }

        if (division === undefined) {
            throw new Error('CurrentDivision not found in Me response');
        }

        // https://start.exactonline.fr/docs/api/v1/financialtransaction/Transactions
        for await (const page of nango.paginate({
            endpoint: `/api/v1/${encodeURIComponent(division)}/financialtransaction/Transactions`,
            params: {
                $select: 'EntryID,EntryNumber,Date,Modified,JournalCode,Status,Type',
                $orderby: 'Modified asc',
                ...(updatedAfter && {
                    $filter: `Modified gt datetime'${updatedAfter}'`
                })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'd.__next',
                limit_name_in_request: '$top',
                limit: 100
            },
            retries: 3
        })) {
            const pageResponse = z
                .union([
                    z.object({
                        d: z.array(z.unknown())
                    }),
                    z.object({
                        d: z.object({
                            results: z.array(z.unknown())
                        })
                    })
                ])
                .safeParse(page);
            if (!pageResponse.success) {
                throw new Error('Unexpected page structure from paginate');
            }

            const results = Array.isArray(pageResponse.data.d) ? pageResponse.data.d : pageResponse.data.d.results;

            const transactions: Array<z.infer<typeof TransactionSchema>> = [];
            for (const raw of results) {
                const parsedItem = TransactionItemSchema.safeParse(raw);
                if (!parsedItem.success) {
                    throw new Error(`Failed to parse transaction item: ${parsedItem.error.message}`);
                }

                const record = parsedItem.data;
                transactions.push({
                    id: record.EntryID,
                    ...(record.EntryNumber != null && { entryNumber: record.EntryNumber }),
                    ...(record.Date != null && { date: record.Date }),
                    ...(record.Modified != null && { modified: record.Modified }),
                    ...(record.JournalCode != null && { journalCode: record.JournalCode }),
                    ...(record.Status != null && { status: record.Status }),
                    ...(record.Type != null && { type: record.Type })
                });
            }

            if (transactions.length === 0) {
                continue;
            }

            await nango.batchSave(transactions, 'Transaction');

            const lastTransaction = transactions[transactions.length - 1];
            if (lastTransaction === undefined) {
                continue;
            }

            const lastModified = lastTransaction.modified;
            if (lastModified) {
                await nango.saveCheckpoint({ updated_after: lastModified });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
