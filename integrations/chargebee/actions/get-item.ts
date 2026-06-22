import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the item. Example: "basic-plan"')
});

const ItemSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        status: z.string().optional(),
        type: z.string(),
        item_family_id: z.string().optional(),
        description: z.string().optional(),
        external_name: z.string().optional(),
        updated_at: z.number().optional(),
        resource_version: z.number().optional(),
        deleted: z.boolean().optional(),
        metered: z.boolean().optional(),
        is_giftable: z.boolean().optional(),
        enabled_for_checkout: z.boolean().optional(),
        enabled_in_portal: z.boolean().optional(),
        is_shippable: z.boolean().optional(),
        included_in_mrr: z.boolean().optional(),
        is_percentage_pricing: z.boolean().optional(),
        archived_at: z.number().optional(),
        channel: z.string().optional(),
        redirect_url: z.string().optional(),
        gift_claim_redirect_url: z.string().optional(),
        unit: z.string().optional(),
        item_applicability: z.string().optional(),
        usage_calculation: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        business_entity_id: z.string().optional(),
        object: z.string().optional()
    })
    .passthrough();

const OutputSchema = ItemSchema;

const WrapperSchema = z.object({
    item: ItemSchema
});

const action = createAction({
    description: 'Retrieve a single catalog item by ID (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/items/retrieve-an-item
            endpoint: `/api/v2/items/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const wrapper = WrapperSchema.parse(response.data);
        return wrapper.item;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
