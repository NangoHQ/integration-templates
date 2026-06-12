import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InvoiceSchema = z.object({
    id: z.string(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    currency_code: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetadataSchema = z.object({
    organization_id: z.string()
});

const RawInvoiceSchema = z.object({
    invoice_id: z.union([z.string(), z.number()]),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.union([z.string(), z.number()]).optional(),
    customer_name: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    currency_code: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const sync = createSync({
    description: 'Sync invoices from Zoho Books.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ path: '/syncs/invoices', method: 'GET' }],
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { updated_after: '' };
        let maxLastModifiedTime = checkpoint.updated_after;

        const params: Record<string, string | number> = {
            organization_id: metadata.organization_id,
            sort_column: 'created_time',
            sort_order: 'A'
        };
        if (checkpoint.updated_after !== '') {
            params['last_modified_time'] = checkpoint.updated_after;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/invoices/#list-invoices
            endpoint: '/books/v3/invoices',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'invoices'
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const invoices = pageResults.map((item: unknown) => {
                const parsed = RawInvoiceSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                }
                const record = parsed.data;
                const id = String(record.invoice_id);
                return {
                    id,
                    ...(record.invoice_number != null && { invoice_number: record.invoice_number }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.customer_id != null && { customer_id: String(record.customer_id) }),
                    ...(record.customer_name != null && { customer_name: record.customer_name }),
                    ...(record.reference_number != null && { reference_number: record.reference_number }),
                    ...(record.date != null && { date: record.date }),
                    ...(record.due_date != null && { due_date: record.due_date }),
                    ...(record.currency_code != null && { currency_code: record.currency_code }),
                    ...(record.total != null && { total: record.total }),
                    ...(record.balance != null && { balance: record.balance }),
                    ...(record.created_time != null && { created_time: record.created_time }),
                    ...(record.last_modified_time != null && {
                        last_modified_time: record.last_modified_time
                    })
                };
            });

            if (invoices.length === 0) {
                continue;
            }

            await nango.batchSave(invoices, 'Invoice');

            for (const invoice of invoices) {
                if (invoice.last_modified_time != null && invoice.last_modified_time > maxLastModifiedTime) {
                    maxLastModifiedTime = invoice.last_modified_time;
                }
            }
        }

        if (maxLastModifiedTime !== checkpoint.updated_after) {
            await nango.saveCheckpoint({
                updated_after: maxLastModifiedTime
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
