import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    external_name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    item_family_id: z.string().optional(),
    type: z.string().optional(),
    is_shippable: z.boolean().optional(),
    is_giftable: z.boolean().optional(),
    redirect_url: z.string().optional(),
    enabled_for_checkout: z.boolean().optional(),
    enabled_in_portal: z.boolean().optional(),
    included_in_mrr: z.boolean().optional(),
    item_applicability: z.string().optional(),
    gift_claim_redirect_url: z.string().optional(),
    unit: z.string().optional(),
    metered: z.boolean().optional(),
    usage_calculation: z.string().optional(),
    is_percentage_pricing: z.boolean().optional(),
    archived_at: z.number().optional(),
    channel: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    deleted: z.boolean().optional(),
    business_entity_id: z.string().optional()
});

type Item = z.infer<typeof ItemSchema>;

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const sync = createSync({
    description: 'Sync catalog items incrementally using updated_at filter (Product Catalog 2.0).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Item: ItemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = parsedCheckpoint.success ? parsedCheckpoint.data.updated_after : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/items
            endpoint: '/api/v2/items',
            params: {
                'sort_by[asc]': 'updated_at',
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
            const upserts: Array<Item> = [];
            const deletions: Array<{ id: string }> = [];
            let lastUpdatedAt: number | undefined;

            for (const element of page) {
                const wrapperSchema = z.object({
                    item: z.unknown()
                });
                const wrapperResult = wrapperSchema.safeParse(element);
                if (!wrapperResult.success) {
                    throw new Error('Unexpected item response structure: missing item wrapper');
                }

                const item = ItemSchema.parse(wrapperResult.data.item);

                if (item.deleted === true || item.status === 'deleted') {
                    deletions.push({ id: item.id });
                } else {
                    upserts.push(item);
                }

                if (item.updated_at !== undefined && (lastUpdatedAt === undefined || item.updated_at > lastUpdatedAt)) {
                    lastUpdatedAt = item.updated_at;
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Item');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Item');
            }

            if (lastUpdatedAt !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: lastUpdatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
