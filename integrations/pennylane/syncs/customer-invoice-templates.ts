import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCustomerInvoiceTemplateSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const CustomerInvoiceTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync customer invoice templates',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CustomerInvoiceTemplate: CustomerInvoiceTemplateSchema
    },
    scopes: ['customer_invoice_templates:readonly'],

    exec: async (nango) => {
        // Blocker: provider only exposes a list endpoint with cursor pagination
        // and no changed-since filter, changelog endpoint, or deleted-record endpoint
        // for this resource.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let cursor = checkpoint?.cursor;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('CustomerInvoiceTemplate');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcustomerinvoicetemplates
            endpoint: '/api/external/v2/customer_invoice_templates',
            params: {
                limit: 100,
                ...(cursor ? { cursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const templates = batch.map((item) => {
                const parsed = ProviderCustomerInvoiceTemplateSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse customer invoice template: ${parsed.error.message}`);
                }
                const record = parsed.data;
                return {
                    id: String(record.id),
                    name: record.name,
                    created_at: record.created_at,
                    updated_at: record.updated_at
                };
            });

            if (templates.length > 0) {
                await nango.batchSave(templates, 'CustomerInvoiceTemplate');
            }

            // Save pagination progress after every page. Without this, a run that
            // exceeds the execution window restarts from page 1 next time instead of
            // resuming where it left off.
            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CustomerInvoiceTemplate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
