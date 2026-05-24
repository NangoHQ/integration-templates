import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    post_id: z.string().describe('The ID of the Facebook post to retrieve. Example: "1148671018324630_122098284213327930"'),
    fields: z.string().optional().describe('Comma-separated list of fields to retrieve. Example: "id,message,created_time,from"')
});

const ProviderPageSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const ProviderAccountsResponseSchema = z.object({
    data: z.array(ProviderPageSchema)
});

const ProviderPostSchema = z
    .object({
        id: z.string(),
        message: z.string().optional(),
        created_time: z.string().optional(),
        from: z
            .object({
                id: z.string(),
                name: z.string()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    created_time: z.string().optional(),
    from: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a Facebook post by post ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-post',
        group: 'Posts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_profile', 'pages_show_list', 'pages_read_engagement'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['fields']) {
            params['fields'] = input['fields'];
        }

        // Extract page ID from post ID if it's a page post (format: {page-id}_{post-id})
        let pageAccessToken: string | undefined;
        if (input.post_id.includes('_')) {
            const pageId = input.post_id.split('_')[0];

            // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
            const accountsResponse = await nango.get({
                endpoint: '/me/accounts',
                retries: 3
            });

            const accountsData = ProviderAccountsResponseSchema.parse(accountsResponse.data);
            const page = accountsData.data.find((p) => p.id === pageId);

            if (page) {
                pageAccessToken = page.access_token;
            }
        }

        // If we have a page access token, use it to override the user token
        if (pageAccessToken) {
            params['access_token'] = pageAccessToken;
        }

        // https://developers.facebook.com/docs/graph-api/reference/post/
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.post_id)}`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Post not found',
                post_id: input.post_id
            });
        }

        const providerPost = ProviderPostSchema.parse(response.data);

        return {
            id: providerPost.id,
            ...(providerPost.message !== undefined && { message: providerPost.message }),
            ...(providerPost.created_time !== undefined && { created_time: providerPost.created_time }),
            ...(providerPost.from !== undefined && { from: providerPost.from })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
