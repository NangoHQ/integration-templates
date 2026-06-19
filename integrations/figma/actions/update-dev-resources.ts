import { z } from 'zod';
import { createAction } from 'nango';

const DevResourceUpdateSchema = z.object({
    id: z.string().describe('Unique identifier of the dev resource. Example: "devres_123"'),
    name: z.string().optional().describe('The name of the dev resource.'),
    url: z.string().optional().describe('The URL of the dev resource.')
});

const InputSchema = z.object({
    dev_resources: z.array(DevResourceUpdateSchema).describe('A list of dev resources that you want to update.')
});

const OutputSchema = z.object({
    links_updated: z.array(z.string()).describe('Ids for dev resources that were successfully updated.'),
    errors: z
        .array(
            z.object({
                id: z.string(),
                error: z.string()
            })
        )
        .optional()
        .describe('Errors for dev resources that could not be updated.')
});

const ProviderResponseSchema = z.object({
    links_updated: z.array(z.string()).optional(),
    errors: z
        .array(
            z.object({
                id: z.string(),
                error: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update dev resources linked to Figma nodes.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_dev_resources:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.figma.com/docs/rest-api/dev-resources-endpoints/
        const response = await nango.put({
            endpoint: '/v1/dev_resources',
            data: {
                dev_resources: input.dev_resources.map((resource) => ({
                    id: resource.id,
                    ...(resource.name !== undefined && { name: resource.name }),
                    ...(resource.url !== undefined && { url: resource.url })
                }))
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            links_updated: providerResponse.links_updated ?? [],
            ...(providerResponse.errors !== undefined && { errors: providerResponse.errors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
