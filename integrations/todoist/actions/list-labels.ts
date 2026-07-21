import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().optional().describe('Maximum number of labels to return per page.')
});

const ProviderLabelSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
        order: z.number(),
        is_favorite: z.boolean()
    })
    .passthrough();

const OutputSchema = z.object({
    results: z.array(ProviderLabelSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: "List the current user's personal labels.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#get-get-labels
            endpoint: '/api/v1/labels',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const ProviderListSchema = z.object({
            results: z.array(ProviderLabelSchema),
            next_cursor: z.string().optional().nullable()
        });

        const parsed = ProviderListSchema.parse(response.data);

        return {
            results: parsed.results,
            ...(parsed.next_cursor != null && { next_cursor: parsed.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
