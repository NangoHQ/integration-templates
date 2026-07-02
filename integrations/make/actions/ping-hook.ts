import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hookId: z.number().int().positive().describe('The ID of the hook to ping. Example: 3329421')
});

const DataStructureItemSchema = z.object({
    name: z.string(),
    type: z.string()
});

const ProviderResponseSchema = z.object({
    address: z.string().optional(),
    attached: z.boolean().optional(),
    learning: z.boolean().optional(),
    gone: z.boolean().optional(),
    dataStructure: z.array(DataStructureItemSchema).optional()
});

const OutputSchema = z.object({
    address: z.string().optional(),
    attached: z.boolean().optional(),
    learning: z.boolean().optional(),
    gone: z.boolean().optional(),
    dataStructure: z.array(DataStructureItemSchema).optional()
});

const action = createAction({
    description: 'Check whether a hook is active and inspect its learned data structure.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/
        const response = await nango.get({
            endpoint: `/hooks/${encodeURIComponent(input.hookId)}/ping`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.address !== undefined && { address: providerResponse.address }),
            ...(providerResponse.attached !== undefined && { attached: providerResponse.attached }),
            ...(providerResponse.learning !== undefined && { learning: providerResponse.learning }),
            ...(providerResponse.gone !== undefined && { gone: providerResponse.gone }),
            ...(providerResponse.dataStructure !== undefined && { dataStructure: providerResponse.dataStructure })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
