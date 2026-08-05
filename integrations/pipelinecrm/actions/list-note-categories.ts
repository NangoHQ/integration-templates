import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const NoteCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    editable: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const NoteCategoryListSchema = z.object({
    entries: z.array(NoteCategorySchema),
    pagination: z.object({
        page: z.number(),
        pages: z.number(),
        per_page: z.number(),
        total: z.number()
    })
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    categories: z.array(NoteCategorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List categories that can be assigned to a note (activity).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const config: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/note_categories',
            params: {
                page: page.toString()
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = NoteCategoryListSchema.parse(response.data);
        const hasMore = parsed.pagination.page < parsed.pagination.pages;

        return {
            categories: parsed.entries,
            ...(hasMore && { next_cursor: (page + 1).toString() })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
