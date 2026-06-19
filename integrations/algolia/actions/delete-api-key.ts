import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    key: z.string().describe('API key to delete. Example: "0f610218198809c8a7ed8c2fd8867183"')
});

const ProviderResponseSchema = z.object({
    deletedAt: z.string()
});

const OutputSchema = z.object({
    deletedAt: z.string().describe('Date and time when the key was deleted, in RFC 3339 format.')
});

const action = createAction({
    description: 'Delete an API key in Algolia.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deleteApiKey'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.algolia.com/doc/rest-api/search/delete-api-key/
            endpoint: `/1/keys/${encodeURIComponent(input.key)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            deletedAt: providerResponse.deletedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
