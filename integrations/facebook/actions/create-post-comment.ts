import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('The ID of the page that owns the post. Example: "1148671018324630"'),
    postId: z.string().describe('The ID of the post to comment on. Example: "1148671018324630_122098284213327930"'),
    message: z.string().describe('The comment text message. Example: "Great post!"')
});

const PageAccountSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const PageAccountsResponseSchema = z.object({
    data: z.array(PageAccountSchema)
});

const ProviderCommentSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a comment on a Facebook post',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-post-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_engagement', 'pages_show_list'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/me/accounts
        const tokenResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const accounts = PageAccountsResponseSchema.parse(tokenResponse.data);
        const pageAccount = accounts.data.find((p) => p.id === input.pageId);

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page ${input.pageId} not found in user accounts`,
                pageId: input.pageId
            });
        }

        // https://developers.facebook.com/docs/graph-api/reference/v18.0/object/comments
        const response = await nango.post({
            endpoint: `/${encodeURIComponent(input.postId)}/comments`,
            params: {
                access_token: pageAccount.access_token
            },
            data: {
                message: input.message
            },
            retries: 3
        });

        const comment = ProviderCommentSchema.parse(response.data);

        return {
            id: comment.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
