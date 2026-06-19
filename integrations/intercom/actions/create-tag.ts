import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the tag to create. Example: "Premium Customers"')
});

const ProviderTagSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier for the created tag'),
    name: z.string().describe('The name of the created tag')
});

const action = createAction({
    description: 'Create a new tag',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Tags
            endpoint: '/tags',
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create tag: empty response from API'
            });
        }

        const tag = ProviderTagSchema.parse(response.data);

        return {
            id: tag.id,
            name: tag.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
