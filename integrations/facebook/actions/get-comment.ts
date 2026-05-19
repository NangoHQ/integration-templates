import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the comment to retrieve. Example: "122098284213327930_1544841897156600"'),
    fields: z.string().optional().describe('Comma-separated list of fields to retrieve. Example: "id,message,created_time,from,like_count"')
});

const ProviderPageSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const ProviderAccountsResponseSchema = z.object({
    data: z.array(ProviderPageSchema)
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
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_profile', 'pages_show_list', 'pages_read_engagement'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
        const accountsResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const accountsData = ProviderAccountsResponseSchema.parse(accountsResponse.data);

        const firstPage = accountsData.data[0];
        if (!firstPage) {
            throw new nango.ActionError({
                type: 'no_pages',
                message: 'No Facebook pages found for this user'
            });
        }

        const pageToken = firstPage['access_token'];
        if (!pageToken) {
            throw new nango.ActionError({
                type: 'no_page_token',
                message: 'Could not retrieve page access token'
            });
        }

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
