import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('The ID of the annotation category to update. Example: 123'),
    category: z.string().describe('The new name for the annotation category. Example: "Updated Category Name"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        id: z.number(),
        category: z.string()
    })
});

const OutputSchema = z.object({
    id: z.number(),
    category: z.string()
});

const action = createAction({
    description: 'Update an annotation category',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-annotation-category',
        group: 'Chart Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://amplitude.com/docs/apis/analytics/chart-annotations
            endpoint: `/api/3/annotation-categories/${encodeURIComponent(input.category_id)}`,
            data: {
                category: input.category
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        return {
            id: parsed.data.id,
            category: parsed.data.category
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
