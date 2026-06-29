import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const CategorySchema = z.object({
    name: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(CategorySchema)
});

const OutputSchema = z.object({
    items: z.array(CategorySchema)
});

const action = createAction({
    description: 'List Coda template categories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['doc:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1
            endpoint: '/categories',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
