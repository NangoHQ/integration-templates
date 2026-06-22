import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCreditNoteSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        type: z.string(),
        updated_at: z.number(),
        customer_id: z.string().optional(),
        total: z.number().optional(),
        amount_allocated: z.number().optional(),
        amount_refunded: z.number().optional(),
        date: z.number().optional(),
        currency_code: z.string().optional()
    })
    .passthrough();

const ProviderListItemSchema = z.object({
    credit_note: ProviderCreditNoteSchema
});

const CreditNoteSchema = z.object({
    id: z.string(),
    status: z.enum(['adjusted', 'refunded', 'refund_due', 'voided']),
    type: z.enum(['adjustment', 'refundable']),
    updated_at: z.number(),
    customer_id: z.string().optional(),
    total: z.number().optional(),
    amount_allocated: z.number().optional(),
    amount_refunded: z.number().optional(),
    date: z.number().optional(),
    currency_code: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const sync = createSync({
    description: 'Sync credit notes incrementally using updated_at filter.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint == null ? undefined : checkpoint['updated_after'];

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/credit_notes
            endpoint: '/api/v2/credit_notes',
            params: {
                sort: 'updated_at[asc]',
                limit: '100',
                ...(updatedAfter !== undefined && { 'updated_at[after]': updatedAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const creditNotes = page.map((item: unknown) => {
                const parsed = ProviderListItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid credit note list item: ${parsed.error.message}`);
                }
                const note = parsed.data.credit_note;
                return {
                    id: note.id,
                    status: note.status,
                    type: note.type,
                    updated_at: note.updated_at,
                    ...(note.customer_id !== undefined && { customer_id: note.customer_id }),
                    ...(note.total !== undefined && { total: note.total }),
                    ...(note.amount_allocated !== undefined && { amount_allocated: note.amount_allocated }),
                    ...(note.amount_refunded !== undefined && { amount_refunded: note.amount_refunded }),
                    ...(note.date !== undefined && { date: note.date }),
                    ...(note.currency_code !== undefined && { currency_code: note.currency_code })
                };
            });

            if (creditNotes.length === 0) {
                continue;
            }

            await nango.batchSave(creditNotes, 'CreditNote');

            const lastNote = creditNotes.at(-1);
            if (lastNote === undefined) {
                throw new Error('Unexpected empty credit notes array after length check');
            }

            await nango.saveCheckpoint({
                updated_after: lastNote.updated_at
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
