import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ItemFamilySchema = z.object({
    id: z.string().describe('The unique identifier of the item family'),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    created_at: z.number().optional(),
    business_entity_id: z.string().optional(),
    channel: z.string().optional()
});

const ProviderItemFamilySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    created_at: z.number().optional(),
    business_entity_id: z.string().optional(),
    channel: z.string().optional()
});

const ProviderListWrapperSchema = z.object({
    item_family: ProviderItemFamilySchema
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Sync item families as a full refresh (Product Catalog 2.0). Dataset is small and static.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ItemFamily: ItemFamilySchema
    },
    // https://apidocs.chargebee.com/docs/api/item_families

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let nextOffset: string | undefined;
        if (rawCheckpoint) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            if (checkpointResult.data.offset !== '') {
                nextOffset = checkpointResult.data.offset;
            }
        }

        // Blocker: Chargebee item_families endpoint does not support incremental filters
        // (e.g., updated_at[gt], modified_since) and the dataset is small and static.
        await nango.trackDeletesStart('ItemFamily');

        // https://apidocs.chargebee.com/docs/api/item_families
        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/item_families
            endpoint: '/api/v2/item_families',
            params: {
                ...(nextOffset !== undefined && { offset: nextOffset })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'string' && nextPageParam !== '' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const wrappers = z.array(ProviderListWrapperSchema).parse(page);

            const families = wrappers.map((wrapper) => ({
                id: wrapper.item_family.id,
                name: wrapper.item_family.name,
                description: wrapper.item_family.description,
                status: wrapper.item_family.status,
                resource_version: wrapper.item_family.resource_version,
                updated_at: wrapper.item_family.updated_at,
                created_at: wrapper.item_family.created_at,
                business_entity_id: wrapper.item_family.business_entity_id,
                channel: wrapper.item_family.channel
            }));

            if (families.length > 0) {
                await nango.batchSave(families, 'ItemFamily');
            }

            // Save pagination progress after every page so a resumed run does not
            // restart from the first page.
            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ItemFamily');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
