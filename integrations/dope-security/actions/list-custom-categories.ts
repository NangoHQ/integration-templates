import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PageInfoSchema = z.object({
    endCursor: z.string().nullable().optional(),
    hasNextPage: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        pageInfo: PageInfoSchema,
        customCategories: z.array(z.string())
    })
});

const OutputSchema = z.object({
    categories: z.array(z.string()),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List all custom categories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://inflight.dope.security/dope.apis/public-api-specification
        const response = await nango.get({
            endpoint: '/v1/custom_categories',
            params: {
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            categories: parsed.data.customCategories,
            ...(parsed.data.pageInfo.hasNextPage && parsed.data.pageInfo.endCursor != null && { nextCursor: parsed.data.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
