import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const TeamSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        permissions: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderListSchema = z.object({
    entries: z.array(TeamSchema),
    pagination: ProviderPaginationSchema
});

const ListTeamsOutputSchema = z.object({
    entries: z.array(TeamSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List teams in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: ListTeamsOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListTeamsOutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/teams',
            params: {
                page: page.toString()
            },
            retries: 3
        });

        const parsed = ProviderListSchema.parse(response.data);
        const hasMore = parsed.pagination.page < parsed.pagination.pages;

        return {
            entries: parsed.entries,
            ...(hasMore && { next_cursor: (page + 1).toString() })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
