import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InvoiceSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    currency_code: z.string().optional(),
    amount_value: z.string().optional(),
    due_amount_value: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync invoices',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        await nango.getCheckpoint();
        const page = 1;

        await nango.trackDeletesStart('Invoice');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.paypal.com/api/invoicing/v2/invoices-list
            endpoint: '/v2/invoicing/invoices',
            params: {
                total_required: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 20,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    const nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                    if (nextPage !== undefined) {
                        await nango.saveCheckpoint({ page: nextPage });
                    }
                }
            },
            retries: 3
        };

        const ProviderInvoiceSchema = z.object({
            id: z.string(),
            status: z.string().optional(),
            detail: z
                .object({
                    invoice_number: z.string().optional(),
                    invoice_date: z.string().optional(),
                    currency_code: z.string().optional()
                })
                .optional(),
            amount: z
                .object({
                    currency_code: z.string().optional(),
                    value: z.string().optional()
                })
                .optional(),
            due_amount: z
                .object({
                    currency_code: z.string().optional(),
                    value: z.string().optional()
                })
                .optional()
        });

        for await (const batch of nango.paginate(proxyConfig)) {
            if (!Array.isArray(batch)) {
                continue;
            }

            const invoices = [];
            for (const item of batch) {
                const parsed = ProviderInvoiceSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                }

                invoices.push({
                    id: parsed.data.id,
                    ...(parsed.data.status != null && {
                        status: parsed.data.status
                    }),
                    ...(parsed.data.detail?.invoice_number != null && {
                        invoice_number: parsed.data.detail.invoice_number
                    }),
                    ...(parsed.data.detail?.invoice_date != null && {
                        invoice_date: parsed.data.detail.invoice_date
                    }),
                    ...(parsed.data.detail?.currency_code != null && {
                        currency_code: parsed.data.detail.currency_code
                    }),
                    ...(parsed.data.amount?.value != null && {
                        amount_value: parsed.data.amount.value
                    }),
                    ...(parsed.data.due_amount?.value != null && {
                        due_amount_value: parsed.data.due_amount.value
                    })
                });
            }

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'Invoice');
            }
        }

        await nango.trackDeletesEnd('Invoice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
