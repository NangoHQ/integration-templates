import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Unique identifier for the item family. Example: "new-family"'),
    name: z.string().describe('Name of the item family. Example: "New Family"'),
    description: z.string().optional().describe('Description of the item family.')
});

const ProviderItemFamilySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    resource_version: z.number().optional().nullable(),
    updated_at: z.number().optional().nullable(),
    created_at: z.number().optional().nullable(),
    channel: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    created_at: z.number().optional(),
    channel: z.string().optional()
});

const action = createAction({
    description: 'Create an item family (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/item_families
            endpoint: '/api/v2/item_families',
            params: {
                id: input.id,
                name: input.name,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 10
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('item_family' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not contain item_family.'
            });
        }

        const providerItemFamily = ProviderItemFamilySchema.parse(raw.item_family);

        return {
            id: providerItemFamily.id,
            name: providerItemFamily.name,
            ...(providerItemFamily.description != null && { description: providerItemFamily.description }),
            ...(providerItemFamily.status != null && { status: providerItemFamily.status }),
            ...(providerItemFamily.resource_version != null && { resource_version: providerItemFamily.resource_version }),
            ...(providerItemFamily.updated_at != null && { updated_at: providerItemFamily.updated_at }),
            ...(providerItemFamily.created_at != null && { created_at: providerItemFamily.created_at }),
            ...(providerItemFamily.channel != null && { channel: providerItemFamily.channel })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
