import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Mixpanel project ID. Example: "4040293"'),
    limit: z.number().int().positive().optional().describe('Maximum number of tags to return. Default: 100'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    project_id: z.number(),
    has_annotations: z.boolean()
});

const OutputSchema = z.object({
    tags: z.array(ProviderTagSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List annotation tags.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.mixpanel.com/reference/get-annotation-tags-1
        const response = await nango.get({
            endpoint: `/api/app/projects/${encodeURIComponent(input.project_id)}/annotations/tags`,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            status: z.string(),
            results: z.array(ProviderTagSchema)
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response format.',
                details: providerResponse.error.format()
            });
        }

        const allTags = providerResponse.data.results;
        const limit = input.limit ?? 100;
        const offset = input.cursor ? Number(input.cursor) : 0;

        if (!Number.isInteger(offset) || offset < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer string.'
            });
        }

        const tags = allTags.slice(offset, offset + limit);
        const nextOffset = offset + limit;
        const hasMore = nextOffset < allTags.length;

        return {
            tags,
            ...(hasMore && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
