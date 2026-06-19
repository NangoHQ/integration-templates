import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of resources to return. Max 100.')
});

const ProviderItemFamilySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    channel: z.string().optional().nullable(),
    business_entity_id: z.string().optional().nullable(),
    deleted: z.boolean()
});

const ItemFamilySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    channel: z.string().optional(),
    business_entity_id: z.string().optional(),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    item_families: z.array(ItemFamilySchema),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List item families (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/item_families/list-item-families
            endpoint: '/api/v2/item_families',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                list: z.array(
                    z.object({
                        item_family: ProviderItemFamilySchema
                    })
                ),
                next_offset: z.string().optional()
            })
            .parse(response.data);

        return {
            item_families: providerResponse.list.map((entry) => ({
                id: entry.item_family.id,
                name: entry.item_family.name,
                ...(entry.item_family.description !== undefined &&
                    entry.item_family.description !== null && {
                        description: entry.item_family.description
                    }),
                ...(entry.item_family.status !== undefined &&
                    entry.item_family.status !== null && {
                        status: entry.item_family.status
                    }),
                ...(entry.item_family.resource_version !== undefined && {
                    resource_version: entry.item_family.resource_version
                }),
                ...(entry.item_family.updated_at !== undefined && {
                    updated_at: entry.item_family.updated_at
                }),
                ...(entry.item_family.channel !== undefined &&
                    entry.item_family.channel !== null && {
                        channel: entry.item_family.channel
                    }),
                ...(entry.item_family.business_entity_id !== undefined &&
                    entry.item_family.business_entity_id !== null && {
                        business_entity_id: entry.item_family.business_entity_id
                    }),
                deleted: entry.item_family.deleted
            })),
            ...(providerResponse.next_offset !== undefined && {
                next_offset: providerResponse.next_offset
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
