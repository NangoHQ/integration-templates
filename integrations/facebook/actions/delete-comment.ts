import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('Facebook comment ID to delete. Example: "122098284213327930_1544841897156600"')
});

const PageAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    access_token: z.string()
});

const PagesResponseSchema = z.object({
    data: z.array(PageAccountSchema)
});

const ProviderSuccessSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a Facebook comment by comment ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_show_list', 'pages_manage_engagement'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/user/accounts
        const pagesResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const pagesData = PagesResponseSchema.parse(pagesResponse.data);

        const firstPage = pagesData.data[0];

        if (!firstPage) {
            throw new nango.ActionError({
                type: 'no_pages_found',
                message: 'No Facebook pages found for this user'
            });
        }

        const pageToken = firstPage.access_token;

        // https://developers.facebook.com/docs/graph-api/reference/comment
        const response = await nango.delete({
            endpoint: `/${encodeURIComponent(input.commentId)}`,
            params: {
                access_token: pageToken
            },
            retries: 3
        });

        const providerResponse = ProviderSuccessSchema.parse(response.data);

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
