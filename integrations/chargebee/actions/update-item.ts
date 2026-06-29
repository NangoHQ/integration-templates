import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The ID of the item to update. Example: "basic-plan"'),
    name: z.string().optional().describe('The name of the item.'),
    description: z.string().nullable().optional().describe('The description of the item.'),
    is_shippable: z.boolean().optional().describe('Whether the item is shippable.'),
    enabled_for_checkout: z.boolean().optional().describe('Whether the item is enabled for checkout.'),
    enabled_in_portal: z.boolean().optional().describe('Whether the item is enabled in the portal.'),
    status: z.enum(['active', 'archived']).optional().describe('The status of the item.')
});

const ProviderItemSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        status: z.string().optional(),
        is_shippable: z.boolean().optional(),
        enabled_for_checkout: z.boolean().optional(),
        enabled_in_portal: z.boolean().optional(),
        resource_version: z.number().optional(),
        updated_at: z.number().optional(),
        created_at: z.number().optional(),
        item_family_id: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    is_shippable: z.boolean().optional(),
    enabled_for_checkout: z.boolean().optional(),
    enabled_in_portal: z.boolean().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    created_at: z.number().optional(),
    item_family_id: z.string().optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Update a catalog item (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {};
        if (input['name'] !== undefined) {
            params['name'] = input['name'];
        }
        if (input['description'] !== undefined) {
            params['description'] = input['description'] === null ? '' : input['description'];
        }
        if (input['is_shippable'] !== undefined) {
            params['is_shippable'] = String(input['is_shippable']);
        }
        if (input['enabled_for_checkout'] !== undefined) {
            params['enabled_for_checkout'] = String(input['enabled_for_checkout']);
        }
        if (input['enabled_in_portal'] !== undefined) {
            params['enabled_in_portal'] = String(input['enabled_in_portal']);
        }
        if (input['status'] !== undefined) {
            params['status'] = input['status'];
        }

        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/items?prod_cat_ver=2#update_item
            endpoint: `/api/v2/items/${encodeURIComponent(input.item_id)}`,
            params,
            retries: 3
        });

        const raw = response.data;
        if (raw == null || typeof raw !== 'object' || !('item' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Chargebee API.'
            });
        }

        const providerItem = ProviderItemSchema.parse(raw.item);

        return {
            id: providerItem.id,
            ...(providerItem.name !== undefined && { name: providerItem.name }),
            ...(providerItem.description !== null && providerItem.description !== undefined && { description: providerItem.description }),
            ...(providerItem.status !== undefined && { status: providerItem.status }),
            ...(providerItem.is_shippable !== undefined && { is_shippable: providerItem.is_shippable }),
            ...(providerItem.enabled_for_checkout !== undefined && { enabled_for_checkout: providerItem.enabled_for_checkout }),
            ...(providerItem.enabled_in_portal !== undefined && { enabled_in_portal: providerItem.enabled_in_portal }),
            ...(providerItem.resource_version !== undefined && { resource_version: providerItem.resource_version }),
            ...(providerItem.updated_at !== undefined && { updated_at: providerItem.updated_at }),
            ...(providerItem.created_at !== undefined && { created_at: providerItem.created_at }),
            ...(providerItem.item_family_id !== undefined && { item_family_id: providerItem.item_family_id }),
            ...(providerItem.type !== undefined && { type: providerItem.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
