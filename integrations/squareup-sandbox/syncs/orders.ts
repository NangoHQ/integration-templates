import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LocationSchema = z.object({
    id: z.string()
});

const LocationsResponseSchema = z.object({
    locations: z.array(LocationSchema).optional()
});

const OrderSchema = z
    .object({
        id: z.string(),
        location_id: z.string(),
        updated_at: z.string().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync orders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Order: OrderSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let updatedAfter = rawCheckpoint?.updated_after || '';
        let cursor = rawCheckpoint?.cursor || '';

        // https://developer.squareup.com/reference/square/locations-api/list-locations
        const locationsResponse = await nango.get({
            endpoint: '/v2/locations',
            retries: 3
        });

        const parsedLocations = LocationsResponseSchema.safeParse(locationsResponse.data);
        if (!parsedLocations.success) {
            throw new Error('Failed to parse locations response');
        }

        const locationIds = parsedLocations.data.locations?.map((location) => location.id) ?? [];
        if (locationIds.length === 0) {
            return;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/orders-api/search-orders
            endpoint: '/v2/orders/search',
            method: 'POST',
            data: {
                location_ids: locationIds,
                ...(cursor && { cursor }),
                query: {
                    sort: {
                        sort_field: 'UPDATED_AT',
                        sort_order: 'ASC'
                    },
                    ...(updatedAfter && {
                        filter: {
                            date_time_filter: {
                                updated_at: {
                                    start_at: updatedAfter
                                }
                            }
                        }
                    })
                },
                limit: 100
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'orders',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        cursor = nextPageParam;
                    } else {
                        cursor = '';
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const orders = page.map((item) => {
                const parsed = OrderSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error('Failed to parse order');
                }
                return parsed.data;
            });

            if (orders.length === 0) {
                continue;
            }

            await nango.batchSave(orders, 'Order');

            if (cursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    cursor
                });
                continue;
            }

            const lastOrder = orders[orders.length - 1];
            if (lastOrder?.updated_at) {
                updatedAfter = lastOrder.updated_at;
            }

            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                cursor: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
