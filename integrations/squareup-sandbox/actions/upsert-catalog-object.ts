import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    idempotency_key: z.string().describe('Unique idempotency key for the request. Example: 5d5b7c1c-5c5c-5c5c-5c5c-5c5c5c5c5c5c'),
    object: z
        .object({
            type: z.string().describe('Catalog object type. Example: ITEM, SUBSCRIPTION_PLAN'),
            id: z.string().optional().describe('Object ID. Omit to create; include to update. Example: DJXLBF4XHUSECQ4P6UDOB7KE'),
            version: z.number().optional().describe('Version for optimistic locking on updates.'),
            present_at_all_locations: z.boolean().optional(),
            present_at_location_ids: z.array(z.string()).optional(),
            absent_at_location_ids: z.array(z.string()).optional(),
            item_data: z.object({}).passthrough().optional(),
            subscription_plan_data: z.object({}).passthrough().optional(),
            category_data: z.object({}).passthrough().optional(),
            discount_data: z.object({}).passthrough().optional(),
            tax_data: z.object({}).passthrough().optional(),
            modifier_list_data: z.object({}).passthrough().optional(),
            modifier_data: z.object({}).passthrough().optional(),
            variation_data: z.object({}).passthrough().optional(),
            item_variation_data: z.object({}).passthrough().optional(),
            custom_attribute_definition_data: z.object({}).passthrough().optional(),
            custom_attribute_data: z.object({}).passthrough().optional()
        })
        .passthrough()
        .describe('Catalog object to create or update.')
});

const IdMappingSchema = z.object({
    client_object_id: z.string(),
    object_id: z.string()
});

const CatalogObjectSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        updated_at: z.string().optional(),
        version: z.number().optional(),
        is_deleted: z.boolean().optional(),
        present_at_all_locations: z.boolean().optional(),
        present_at_location_ids: z.array(z.string()).optional(),
        absent_at_location_ids: z.array(z.string()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    catalog_object: CatalogObjectSchema,
    id_mappings: z.array(IdMappingSchema).optional()
});

const OutputSchema = z.object({
    catalog_object: z.record(z.string(), z.unknown()),
    id_mappings: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Create/update catalog object.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ITEMS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const objectType = input.object.type;

        if (objectType === 'ITEM') {
            const itemData = input.object.item_data;
            if (!itemData || !Array.isArray(itemData['variations']) || itemData['variations'].length === 0) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'ITEM objects require at least one variation in item_data.variations.'
                });
            }
        }

        if (objectType === 'SUBSCRIPTION_PLAN') {
            const planData = input.object.subscription_plan_data;
            if (planData && Array.isArray(planData['phases'])) {
                for (const phase of planData['phases']) {
                    if (typeof phase === 'object' && phase !== null) {
                        if ('recurring_price_money' in phase) {
                            throw new nango.ActionError({
                                type: 'invalid_input',
                                message: 'SUBSCRIPTION_PLAN phases must use pricing.price_money instead of the deprecated recurring_price_money.'
                            });
                        }
                        if ('periods' in phase && phase['periods'] === 0) {
                            throw new nango.ActionError({
                                type: 'invalid_input',
                                message: 'SUBSCRIPTION_PLAN perpetual phases must omit periods entirely. Sending periods: 0 throws VALUE_TOO_LOW.'
                            });
                        }
                    }
                }
            }
        }

        const response = await nango.post({
            // https://developer.squareup.com/reference/square/catalog-api/upsert-catalog-object
            endpoint: '/v2/catalog/object',
            data: {
                idempotency_key: input.idempotency_key,
                object: input.object
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            catalog_object: parsed.catalog_object,
            ...(parsed.id_mappings !== undefined && { id_mappings: parsed.id_mappings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
