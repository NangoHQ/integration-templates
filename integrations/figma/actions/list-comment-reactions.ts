import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('File key or branch key. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    comment_id: z.string().describe('Comment ID. Example: "1774450119"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const ReactionSchema = z.object({
    user: UserSchema,
    emoji: z.string(),
    created_at: z.string()
});

const OutputSchema = z.object({
    reactions: z.array(ReactionSchema),
    next_cursor: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    prev_page: z.string().optional(),
    next_page: z.string().optional()
});

const ProviderResponseSchema = z.object({
    reactions: z.array(ReactionSchema),
    pagination: ProviderPaginationSchema
});

const action = createAction({
    description: 'List reactions on a Figma comment.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-comment-reactions',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_comments:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.figma.com/docs/rest-api/comments-endpoints/
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/comments/${encodeURIComponent(input.comment_id)}/reactions`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        if (providerResponse.pagination.next_page) {
            const url = new URL(providerResponse.pagination.next_page);
            const cursor = url.searchParams.get('cursor');
            if (cursor) {
                next_cursor = cursor;
            }
        }

        return {
            reactions: providerResponse.reactions,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
