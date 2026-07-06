import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the list to create. Example: "My New List"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            name: z.string(),
            created: z.string().optional(),
            updated: z.string().optional(),
            opt_in_process: z.string().optional()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional(),
    opt_in_process: z.string().optional()
});

const action = createAction({
    description: 'Create a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/create_list
            endpoint: '/api/lists',
            data: {
                data: {
                    type: 'list',
                    attributes: {
                        name: input.name
                    }
                }
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 1
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.data.id,
            name: providerResponse.data.attributes.name,
            ...(providerResponse.data.attributes.created !== undefined && {
                created: providerResponse.data.attributes.created
            }),
            ...(providerResponse.data.attributes.updated !== undefined && {
                updated: providerResponse.data.attributes.updated
            }),
            ...(providerResponse.data.attributes.opt_in_process !== undefined && {
                opt_in_process: providerResponse.data.attributes.opt_in_process
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
