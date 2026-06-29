import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WishlistItemSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    variant_id: z.number().optional()
});

const WishlistSchema = z.object({
    id: z.number(),
    customer_id: z.number(),
    name: z.string(),
    is_public: z.boolean(),
    token: z.string(),
    items: z.array(WishlistItemSchema).optional()
});

const WishlistModelSchema = z.object({
    id: z.string(),
    customer_id: z.number(),
    name: z.string(),
    is_public: z.boolean(),
    token: z.string(),
    items: z
        .array(
            z.object({
                id: z.number(),
                product_id: z.number(),
                variant_id: z.number().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync wishlists.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://developer.bigcommerce.com/docs/rest-management/wishlists#get-wishlists
    endpoints: [{ method: 'GET', path: '/syncs/wishlists' }],
    models: {
        Wishlist: WishlistModelSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { page: 1 });
        let page: number | undefined = checkpoint.page;

        // Blocker: the /v3/wishlists endpoint does not support a changed-since filter,
        // deleted-record endpoint, or resumable cursor.
        await nango.trackDeletesStart('Wishlist');

        // https://developer.bigcommerce.com/docs/rest-management/wishlists#get-wishlists
        const proxyConfig: ProxyConfiguration = {
            // https://developer.bigcommerce.com/docs/rest-management/wishlists#get-wishlists
            endpoint: '/v3/wishlists',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: page,
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async (state) => {
                    page = typeof state.nextPageParam === 'number' ? state.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const items of nango.paginate(proxyConfig)) {
            const parsed = z.array(WishlistSchema).safeParse(items);

            if (!parsed.success) {
                throw new Error(`Failed to parse wishlists: ${parsed.error.message}`);
            }

            const mapped = parsed.data.map((wishlist) => ({
                id: String(wishlist.id),
                customer_id: wishlist.customer_id,
                name: wishlist.name,
                is_public: wishlist.is_public,
                token: wishlist.token,
                ...(wishlist.items !== undefined && { items: wishlist.items })
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Wishlist');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.trackDeletesEnd('Wishlist');
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
