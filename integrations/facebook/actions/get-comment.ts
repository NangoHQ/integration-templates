import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the comment to retrieve. Example: "122098284213327930_1544841897156600"'),
    fields: z.string().optional().describe('Comma-separated list of fields to retrieve. Example: "id,message,created_time,from,like_count"'),
    pageId: z
        .string()
        .optional()
        .describe(
            'The Facebook Page ID that owns the comment. Required when the user manages multiple pages to ensure the correct page token is used. Example: "1148671018324630"'
        )
});

const ProviderPageSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    created_time: z.string().optional(),
    from: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    like_count: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    createdTime: z.string().optional(),
    from: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    likeCount: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a Facebook comment by comment ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_profile', 'pages_show_list', 'pages_read_engagement'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
        let page: z.infer<typeof ProviderPageSchema> | undefined;
        let pagesCount = 0;
        let firstPage: z.infer<typeof ProviderPageSchema> | undefined;

        outer: for await (const batch of nango.paginate<z.infer<typeof ProviderPageSchema>>({
            endpoint: '/me/accounts',
            params: { fields: 'id,access_token' },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.cursors.after',
                cursor_name_in_request: 'after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        })) {
            for (const p of batch) {
                if (input.pageId) {
                    if (p.id === input.pageId) {
                        page = ProviderPageSchema.parse(p);
                        break outer;
                    }
                } else {
                    pagesCount++;
                    if (pagesCount === 1) firstPage = ProviderPageSchema.parse(p);
                    if (pagesCount > 1) break outer;
                }
            }
        }

        if (!input.pageId) {
            if (pagesCount === 0) {
                throw new nango.ActionError({ type: 'page_not_found', message: 'No Facebook pages found for this user' });
            }
            if (pagesCount > 1) {
                throw new nango.ActionError({ type: 'page_id_required', message: 'pageId is required when multiple pages are accessible' });
            }
            page = firstPage;
        }

        if (!page) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page with ID ${input.pageId} not found or not accessible`
            });
        }

        const pageToken = page.access_token;

        const params: Record<string, string> = {
            access_token: pageToken
        };
        if (input['fields']) {
            params['fields'] = input['fields'];
        }

        const response = await nango.get({
            // https://developers.facebook.com/docs/graph-api/reference/comment/
            endpoint: `/${encodeURIComponent(input.commentId)}`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found',
                comment_id: input.commentId
            });
        }

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            ...(providerComment.message !== undefined && { message: providerComment.message }),
            ...(providerComment.created_time !== undefined && { createdTime: providerComment.created_time }),
            ...(providerComment.from !== undefined && {
                from: {
                    id: providerComment.from.id,
                    name: providerComment.from.name
                }
            }),
            ...(providerComment.like_count !== undefined && { likeCount: providerComment.like_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
