import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('The ID of the annotation category to retrieve. Example: 12345')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    category: z.string()
});

const OutputSchema = z.object({
    id: z.number().describe('The unique identifier of the category.'),
    name: z.string().describe('The name of the category.')
});

const action = createAction({
    description: 'Retrieve an annotation category.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-annotation-category',
        group: 'Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/chart-annotations
            endpoint: `/api/3/annotation-categories/${encodeURIComponent(String(input.category_id))}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('data' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from Amplitude API.'
            });
        }

        const envelope = z
            .object({
                data: ProviderCategorySchema
            })
            .parse(response.data);

        return {
            id: envelope.data.id,
            name: envelope.data.category
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
