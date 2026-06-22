import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier for the item. Example: "premium-plan"'),
    name: z.string().describe('A unique display name for the item. Example: "Premium Plan"'),
    type: z.enum(['plan', 'addon', 'charge']).describe('The type of the item.'),
    item_family_id: z.string().describe('The id of the item family that the item belongs to. Example: "saas-plans"'),
    description: z.string().optional().describe('Description of the item.'),
    is_shippable: z.boolean().optional().describe('Indicates that the item is a physical product.'),
    enabled_for_checkout: z.boolean().optional().describe('Allow the plan to be subscribed to via Checkout. Applies only for plan-items.'),
    enabled_in_portal: z
        .boolean()
        .optional()
        .describe('Allow customers to change their subscription to this plan via the Self-Serve Portal. Applies only for plan-items.'),
    metered: z.boolean().optional().describe('Specifies whether the item undergoes metered billing.')
});

const ProviderItemSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['plan', 'addon', 'charge']),
        item_family_id: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        is_shippable: z.boolean().optional().nullable(),
        enabled_for_checkout: z.boolean().optional().nullable(),
        enabled_in_portal: z.boolean().optional().nullable(),
        metered: z.boolean().optional().nullable(),
        status: z.string().optional().nullable(),
        resource_version: z.number().optional().nullable(),
        updated_at: z.number().optional().nullable(),
        deleted: z.boolean().optional().nullable(),
        external_name: z.string().optional().nullable(),
        is_giftable: z.boolean().optional().nullable(),
        redirect_url: z.string().optional().nullable(),
        included_in_mrr: z.boolean().optional().nullable(),
        item_applicability: z.string().optional().nullable(),
        gift_claim_redirect_url: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        usage_calculation: z.string().optional().nullable(),
        is_percentage_pricing: z.boolean().optional().nullable(),
        archived_at: z.number().optional().nullable(),
        channel: z.string().optional().nullable(),
        metadata: z.record(z.string(), z.unknown()).optional().nullable(),
        business_entity_id: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['plan', 'addon', 'charge']),
    item_family_id: z.string().optional(),
    description: z.string().optional(),
    is_shippable: z.boolean().optional(),
    enabled_for_checkout: z.boolean().optional(),
    enabled_in_portal: z.boolean().optional(),
    metered: z.boolean().optional(),
    status: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Create a catalog item (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/items
            endpoint: '/api/v2/items',
            params: {
                id: input.id,
                name: input.name,
                type: input.type,
                item_family_id: input.item_family_id,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.is_shippable !== undefined && { is_shippable: String(input.is_shippable) }),
                ...(input.enabled_for_checkout !== undefined && { enabled_for_checkout: String(input.enabled_for_checkout) }),
                ...(input.enabled_in_portal !== undefined && { enabled_in_portal: String(input.enabled_in_portal) }),
                ...(input.metered !== undefined && { metered: String(input.metered) })
            },
            retries: 10
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !('item' in rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Chargebee API: missing item object.'
            });
        }

        const providerItem = ProviderItemSchema.parse(rawData.item);

        return {
            id: providerItem.id,
            name: providerItem.name,
            type: providerItem.type,
            ...(providerItem.item_family_id != null && { item_family_id: providerItem.item_family_id }),
            ...(providerItem.description != null && { description: providerItem.description }),
            ...(providerItem.is_shippable != null && { is_shippable: providerItem.is_shippable }),
            ...(providerItem.enabled_for_checkout != null && { enabled_for_checkout: providerItem.enabled_for_checkout }),
            ...(providerItem.enabled_in_portal != null && { enabled_in_portal: providerItem.enabled_in_portal }),
            ...(providerItem.metered != null && { metered: providerItem.metered }),
            ...(providerItem.status != null && { status: providerItem.status }),
            ...(providerItem.resource_version != null && { resource_version: providerItem.resource_version }),
            ...(providerItem.updated_at != null && { updated_at: providerItem.updated_at }),
            ...(providerItem.deleted != null && { deleted: providerItem.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
