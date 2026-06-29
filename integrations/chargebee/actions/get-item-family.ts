import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Item family ID. Example: "saas-plans"')
});

const ProviderItemFamilySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(['active', 'archived', 'deleted']).optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    channel: z.string().optional(),
    business_entity_id: z.string().optional(),
    deleted: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    item_family: ProviderItemFamilySchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    channel: z.string().optional(),
    business_entity_id: z.string().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single item family by ID (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/item_families
            endpoint: `/api/v2/item_families/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item family not found or invalid response'
            });
        }

        const providerItemFamily = parsed.data.item_family;

        return {
            id: providerItemFamily.id,
            name: providerItemFamily.name,
            ...(providerItemFamily.description !== undefined && { description: providerItemFamily.description }),
            ...(providerItemFamily.status !== undefined && { status: providerItemFamily.status }),
            ...(providerItemFamily.resource_version !== undefined && { resource_version: providerItemFamily.resource_version }),
            ...(providerItemFamily.updated_at !== undefined && { updated_at: providerItemFamily.updated_at }),
            ...(providerItemFamily.channel !== undefined && { channel: providerItemFamily.channel }),
            ...(providerItemFamily.business_entity_id !== undefined && { business_entity_id: providerItemFamily.business_entity_id }),
            ...(providerItemFamily.deleted !== undefined && { deleted: providerItemFamily.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
