import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    postId: z.string().describe('The post ID to list comments for. Example: "1148671018324630_122098284213327930"'),
    filter: z
        .enum(['toplevel', 'stream'])
        .optional()
        .describe('Filter for comments. "toplevel" (default) returns top-level comments only. "stream" returns all comments including replies.'),
    order: z
        .enum(['chronological', 'reverse_chronological'])
        .optional()
        .describe('Order of comments. "chronological" = oldest first, "reverse_chronological" = newest first.'),
    summary: z.boolean().optional().describe('Include summary metadata (total_count, order, can_comment).'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FromSchema = z.object({
    name: z.string().optional(),
    id: z.string()
});

const CommentSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    created_time: z.string(),
    from: FromSchema.optional()
});

const PagingCursorsSchema = z.object({
    before: z.string().optional(),
    after: z.string().optional()
});

const PagingSchema = z.object({
    cursors: PagingCursorsSchema.optional(),
    next: z.string().optional()
});

const SummarySchema = z.object({
    order: z.enum(['chronological', 'reverse_chronological', 'ranked']).optional(),
    total_count: z.number().optional(),
    can_comment: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(CommentSchema).optional(),
    paging: PagingSchema.optional(),
    summary: SummarySchema.optional()
});

const PageAccountSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const PageAccountsResponseSchema = z.object({
    data: z.array(PageAccountSchema).optional()
});

const CommentOutputSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    createdTime: z.string(),
    from: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    comments: z.array(CommentOutputSchema),
    nextCursor: z.string().optional(),
    summary: z
        .object({
            order: z.enum(['chronological', 'reverse_chronological', 'ranked']).optional(),
            totalCount: z.number().optional(),
            canComment: z.boolean().optional()
        })
        .optional()
});

/**
 * Extract page ID from post ID.
 * Post IDs are in format: {page-id}_{post-id}
 */
function extractPageId(postId: string): string | null {
    const underscoreIndex = postId.indexOf('_');
    if (underscoreIndex === -1) {
        return null;
    }
    return postId.slice(0, underscoreIndex);
}

const action = createAction({
    description: 'List comments on a Facebook post with pagination support',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-post-comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_read_engagement', 'pages_read_user_content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Extract page ID from post ID
        const pageId = extractPageId(input.postId);
        if (!pageId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid post ID format. Expected format: {page-id}_{post-id}'
            });
        }

        // https://developers.facebook.com/docs/graph-api/reference/me/accounts/
        const accountsResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const accountsData = PageAccountsResponseSchema.parse(accountsResponse.data);
        const pages = accountsData.data || [];

        // Find the page matching the post's page ID
        const page = pages.find((p) => p.id === pageId);
        if (!page) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page ${pageId} not found in user accounts. Ensure the user has access to this page.`
            });
        }

        // Build query parameters for comments endpoint
        const params: Record<string, string | number> = {};

        if (input.filter) {
            params['filter'] = input.filter;
        }
        if (input.order) {
            params['order'] = input.order;
        }
        if (input.summary) {
            params['summary'] = 'true';
        }
        if (input.cursor) {
            params['after'] = input.cursor;
        }

        // Use page access token to fetch comments
        // https://developers.facebook.com/docs/graph-api/reference/object/comments/
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.postId)}/comments`,
            params: {
                ...params,
                access_token: page.access_token
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        // Map provider response to normalized output
        const comments = (providerData.data || []).map((comment) => ({
            id: comment.id,
            ...(comment.message !== undefined && { message: comment.message }),
            createdTime: comment.created_time,
            ...(comment.from !== undefined && {
                from: {
                    id: comment.from.id,
                    ...(comment.from.name !== undefined && { name: comment.from.name })
                }
            })
        }));

        // Extract next cursor from paging
        let nextCursor: string | undefined;
        if (providerData.paging?.cursors?.after) {
            nextCursor = providerData.paging.cursors.after;
        }

        // Map summary if present
        let summary: z.infer<typeof OutputSchema>['summary'] | undefined;
        if (providerData.summary) {
            summary = {
                ...(providerData.summary.order !== undefined && { order: providerData.summary.order }),
                ...(providerData.summary.total_count !== undefined && { totalCount: providerData.summary.total_count }),
                ...(providerData.summary.can_comment !== undefined && { canComment: providerData.summary.can_comment })
            };
        }

        return {
            comments,
            ...(nextCursor !== undefined && { nextCursor }),
            ...(summary !== undefined && { summary })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
