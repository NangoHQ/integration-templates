import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SubscriberSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    source: z.string().optional(),
    order_id: z.number().optional(),
    channel_id: z.number().optional(),
    consents: z.array(z.string()).optional(),
    date_modified: z.string(),
    date_created: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive()
});

const ProviderSubscriberSchema = z.object({
    id: z.number(),
    email: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    order_id: z.number().nullable().optional(),
    channel_id: z.number().nullable().optional(),
    consents: z.array(z.string()).nullable().optional(),
    date_modified: z.string(),
    date_created: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync email newsletter subscribers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://developer.bigcommerce.com/docs/rest-management/customers
    endpoints: [{ method: 'GET', path: '/syncs/subscribers' }],
    models: {
        Subscriber: SubscriberSchema
    },
    scopes: ['store_v2_customers_read_only'],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', page: 1 });
        const updatedAfter = checkpoint.updated_after;
        let page: number | undefined = checkpoint.page;
        const isFullRefresh = !updatedAfter;
        const syncStartedAt = new Date().toISOString();

        if (isFullRefresh) {
            await nango.trackDeletesStart('Subscriber');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.bigcommerce.com/docs/rest-management/customers
            endpoint: '/v3/customers/subscribers',
            params: {
                ...(updatedAfter && { 'date_modified:min': updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async (paginationState) => {
                    page = typeof paginationState.nextPageParam === 'number' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const items of nango.paginate(proxyConfig)) {
            const subscribers = [];

            for (const raw of items) {
                const parsed = ProviderSubscriberSchema.safeParse(raw);

                if (!parsed.success) {
                    throw new Error(`Failed to parse subscriber: ${parsed.error.message}`);
                }

                const record = parsed.data;

                subscribers.push({
                    id: String(record.id),
                    email: record.email,
                    ...(record.first_name != null && { first_name: record.first_name }),
                    ...(record.last_name != null && { last_name: record.last_name }),
                    ...(record.source != null && { source: record.source }),
                    ...(record.order_id != null && { order_id: record.order_id }),
                    ...(record.channel_id != null && { channel_id: record.channel_id }),
                    ...(record.consents != null && { consents: record.consents }),
                    date_modified: record.date_modified,
                    ...(record.date_created != null && { date_created: record.date_created })
                });
            }

            if (subscribers.length > 0) {
                await nango.batchSave(subscribers, 'Subscriber');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    page
                });
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Subscriber');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartedAt,
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
