import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    accountId: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderInvoiceSchema = z.object({
    id: z.union([z.string(), z.number()]),
    customerid: z.union([z.string(), z.number()]).optional(),
    status: z.number().optional(),
    display_status: z.string().optional(),
    v3_status: z.string().optional(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    updated: z.string().optional(),
    created_at: z.string().optional(),
    invoice_number: z.string().optional(),
    create_date: z.string().optional(),
    due_date: z.string().optional(),
    description: z.string().optional()
});

const InvoiceSchema = z.object({
    id: z.string(),
    customer_id: z.string().optional(),
    status: z.number().optional(),
    display_status: z.string().optional(),
    v3_status: z.string().optional(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    updated: z.string().optional(),
    created_at: z.string().optional(),
    invoice_number: z.string().optional(),
    create_date: z.string().optional(),
    due_date: z.string().optional(),
    description: z.string().optional()
});

const sync = createSync({
    description: 'Sync invoices.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadataRaw);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;

        const checkpointRaw = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(
            typeof checkpointRaw === 'object' && checkpointRaw !== null && Object.keys(checkpointRaw).length > 0 ? checkpointRaw : { updated_after: '' }
        );
        if (!checkpointResult.success) {
            throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
        }
        const checkpoint = checkpointResult.data;
        const updatedAfter = checkpoint.updated_after || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.freshbooks.com/api/invoices
            endpoint: `/accounting/account/${encodeURIComponent(metadata.accountId)}/invoices/invoices`,
            params: {
                sort: 'updated:asc',
                ...(updatedAfter && { 'search[updated_since]': updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'response.result.invoices'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            const invoices: Array<z.infer<typeof InvoiceSchema>> = [];
            let maxUpdated: string | undefined;

            for (const raw of page) {
                const parsed = ProviderInvoiceSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                }

                const item = parsed.data;
                invoices.push({
                    id: String(item.id),
                    ...(item.customerid !== undefined && { customer_id: String(item.customerid) }),
                    ...(item.status !== undefined && { status: item.status }),
                    ...(item.display_status !== undefined && { display_status: item.display_status }),
                    ...(item.v3_status !== undefined && { v3_status: item.v3_status }),
                    ...(item.amount !== undefined && {
                        amount: {
                            ...(item.amount.amount !== undefined && { amount: item.amount.amount }),
                            ...(item.amount.code !== undefined && { code: item.amount.code })
                        }
                    }),
                    ...(item.updated !== undefined && { updated: item.updated }),
                    ...(item.created_at !== undefined && { created_at: item.created_at }),
                    ...(item.invoice_number !== undefined && { invoice_number: item.invoice_number }),
                    ...(item.create_date !== undefined && { create_date: item.create_date }),
                    ...(item.due_date !== undefined && { due_date: item.due_date }),
                    ...(item.description !== undefined && { description: item.description })
                });

                if (item.updated) {
                    const formatted = item.updated.replace(' ', 'T');
                    if (maxUpdated === undefined || formatted > maxUpdated) {
                        maxUpdated = formatted;
                    }
                }
            }

            if (invoices.length === 0) {
                continue;
            }

            await nango.batchSave(invoices, 'Invoice');

            if (maxUpdated) {
                await nango.saveCheckpoint({
                    updated_after: maxUpdated
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
