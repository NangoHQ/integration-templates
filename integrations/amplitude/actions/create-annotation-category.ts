import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category: z.string().describe('The name of the annotation category. Example: "Releases"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        id: z.number(),
        category: z.string()
    })
});

const OutputSchema = z.object({
    id: z.number().describe('The unique ID of the created annotation category.'),
    category: z.string().describe('The name of the annotation category.')
});

const action = createAction({
    description: 'Create an annotation category.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/chart-annotations#create-an-annotation-category
            endpoint: '/api/3/annotation-categories',
            data: {
                category: input.category
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.data.id,
            category: providerResponse.data.category
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
