import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SupplierInvoiceSchema = z.object({
    id: z.string(),
    source_id: z.string().optional(),
    supplier_id: z.string().optional(),
    status: z.string().optional(),
    label: z.string().optional(),
    amount: z.string().optional(),
    currency: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    file_url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ChangelogItemSchema = z.object({
    id: z.union([z.string(), z.number()]),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string()
});

const ChangelogResponseSchema = z.object({
    items: z.array(ChangelogItemSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional().nullable()
});

const RawSupplierInvoiceSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        source_id: z.union([z.string(), z.number()]).optional().nullable(),
        supplier: z
            .object({
                id: z.union([z.string(), z.number()])
            })
            .optional()
            .nullable(),
        payment_status: z.string().optional().nullable(),
        label: z.string().optional().nullable(),
        amount: z.union([z.string(), z.number()]).optional().nullable(),
        currency: z.string().optional().nullable(),
        date: z.string().optional().nullable(),
        deadline: z.string().optional().nullable(),
        public_file_url: z.string().optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable()
    })
    .passthrough();

const CheckpointSchema = z.object({
    start_date: z.string(),
    cursor: z.string()
});

function normalizeSupplierInvoice(raw: z.infer<typeof RawSupplierInvoiceSchema>): z.infer<typeof SupplierInvoiceSchema> {
    return {
        id: String(raw.id),
        ...(raw.source_id != null && { source_id: String(raw.source_id) }),
        ...(raw.supplier != null && { supplier_id: String(raw.supplier.id) }),
        ...(raw.payment_status != null && { status: raw.payment_status }),
        ...(raw.label != null && { label: raw.label }),
        ...(raw.amount != null && { amount: String(raw.amount) }),
        ...(raw.currency != null && { currency: raw.currency }),
        ...(raw.date != null && { date: raw.date }),
        ...(raw.deadline != null && { due_date: raw.deadline }),
        ...(raw.public_file_url != null && { file_url: raw.public_file_url }),
        ...(raw.created_at != null && { created_at: raw.created_at }),
        ...(raw.updated_at != null && { updated_at: raw.updated_at })
    };
}

const sync = createSync({
    description: 'Continuously sync supplier invoices.',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SupplierInvoice: SupplierInvoiceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const validatedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;

        let startDate: string | undefined;
        let cursor: string | undefined;
        let lastProcessedAt: string | undefined;

        if (validatedCheckpoint && validatedCheckpoint.success) {
            startDate = validatedCheckpoint.data.start_date || undefined;
            cursor = validatedCheckpoint.data.cursor || undefined;
        }

        if (!checkpoint) {
            // The changelog feed only retains recent history, so a brand-new connection must first
            // backfill every existing supplier invoice via full enumeration before switching to the
            // changelog-based incremental strategy below.
            const backfillStartedAt = new Date().toISOString();
            const backfillConfig: ProxyConfiguration = {
                // https://pennylane.readme.io/reference/getsupplierinvoices
                endpoint: '/api/external/v2/supplier_invoices',
                retries: 3,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'cursor',
                    cursor_path_in_response: 'next_cursor',
                    response_path: 'items',
                    limit_name_in_request: 'limit',
                    limit: 100
                }
            };

            for await (const page of nango.paginate(backfillConfig)) {
                const backfilled = page.map((item: unknown) => normalizeSupplierInvoice(RawSupplierInvoiceSchema.parse(item)));
                if (backfilled.length > 0) {
                    await nango.batchSave(backfilled, 'SupplierInvoice');
                }
            }

            // Hand off to the changelog-based incremental strategy on the next scheduled run,
            // starting from the moment this backfill began.
            await nango.saveCheckpoint({ start_date: backfillStartedAt, cursor: '' });
            return;
        }

        // Pennylane changelog endpoints do not allow start_date and cursor in the same request.
        // nango.paginate would keep start_date in params on every page, so a manual loop is required.
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const params: { limit: number; cursor?: string; start_date?: string } = {
                limit: 100
            };

            if (cursor) {
                params.cursor = cursor;
            } else if (startDate) {
                params.start_date = startDate;
            }

            const response = await nango.get({
                // https://pennylane.readme.io/reference/getsupplierinvoiceschanges
                endpoint: '/api/external/v2/changelogs/supplier_invoices',
                params,
                retries: 3
            });

            const parsed = ChangelogResponseSchema.parse(response.data);

            const operations = new Map<string, 'upsert' | 'delete'>();

            for (const change of parsed.items) {
                operations.set(String(change.id), change.operation === 'delete' ? 'delete' : 'upsert');
                lastProcessedAt = change.processed_at;
            }

            const upsertIds: string[] = [];
            const deleteIds: string[] = [];

            for (const [id, op] of operations) {
                if (op === 'delete') {
                    deleteIds.push(id);
                } else {
                    upsertIds.push(id);
                }
            }

            const upserts: Array<z.infer<typeof SupplierInvoiceSchema>> = [];

            for (const id of upsertIds) {
                const invoiceResponse = await nango.get({
                    // https://pennylane.readme.io/reference/getsupplierinvoice
                    endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(id)}`,
                    retries: 3
                });

                const raw = RawSupplierInvoiceSchema.parse(invoiceResponse.data);
                upserts.push(normalizeSupplierInvoice(raw));
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'SupplierInvoice');
            }

            if (deleteIds.length > 0) {
                await nango.batchDelete(
                    deleteIds.map((id) => ({ id })),
                    'SupplierInvoice'
                );
            }

            if (!parsed.has_more || !parsed.next_cursor) {
                break;
            }

            cursor = parsed.next_cursor;

            await nango.saveCheckpoint({
                start_date: startDate || '',
                cursor
            });
        }

        if (lastProcessedAt) {
            await nango.saveCheckpoint({ start_date: lastProcessedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
