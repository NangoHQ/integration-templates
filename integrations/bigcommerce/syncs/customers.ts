import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCustomerSchema = z.object({
    id: z.number(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    customer_group_id: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    tax_exempt_category: z.string().nullable().optional(),
    accepts_marketing: z.boolean().nullable().optional(),
    address_count: z.number().nullable().optional(),
    origin_channel_id: z.number().nullable().optional(),
    channel_ids: z.array(z.number()).nullable().optional(),
    authentication: z.object({}).passthrough().nullable().optional(),
    store_credit: z.object({}).passthrough().nullable().optional(),
    attributes: z.array(z.unknown()).nullable().optional()
});

const CustomerSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    customer_group_id: z.number().optional(),
    notes: z.string().optional(),
    tax_exempt_category: z.string().optional(),
    accepts_marketing: z.boolean().optional(),
    address_count: z.number().optional(),
    origin_channel_id: z.number().optional(),
    channel_ids: z.array(z.number()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync customers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', page: 1 });
        const updatedAfter = checkpoint.updated_after;
        let page: number | undefined = checkpoint.page;
        const isFullRefresh = !updatedAfter;
        const syncStartedAt = new Date().toISOString();

        if (isFullRefresh) {
            await nango.trackDeletesStart('Customer');
        }

        const params: Record<string, string> = {};
        if (updatedAfter) {
            params['date_modified:min'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.bigcommerce.com/docs/rest-management/customers
            endpoint: '/v3/customers',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async (state) => {
                    page = typeof state.nextPageParam === 'number' ? state.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const customers = [];
            for (const raw of batch) {
                const parsed = ProviderCustomerSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse customer record: ${parsed.error.message}`);
                }
                const record = parsed.data;
                customers.push({
                    id: String(record.id),
                    first_name: record.first_name ?? undefined,
                    last_name: record.last_name ?? undefined,
                    email: record.email ?? undefined,
                    phone: record.phone ?? undefined,
                    date_created: record.date_created ?? undefined,
                    date_modified: record.date_modified ?? undefined,
                    customer_group_id: record.customer_group_id ?? undefined,
                    notes: record.notes ?? undefined,
                    tax_exempt_category: record.tax_exempt_category ?? undefined,
                    accepts_marketing: record.accepts_marketing ?? undefined,
                    address_count: record.address_count ?? undefined,
                    origin_channel_id: record.origin_channel_id ?? undefined,
                    channel_ids: record.channel_ids ?? undefined
                });
            }

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    page
                });
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Customer');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartedAt,
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
