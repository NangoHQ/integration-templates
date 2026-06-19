import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('The Facebook Page ID to post the photo to. Example: "1148671018324630"'),
    url: z.string().describe('The URL of the photo to upload. Example: "https://example.com/photo.jpg"'),
    caption: z.string().optional().describe('Caption text for the photo. Example: "Check out our new product!"'),
    published: z
        .boolean()
        .optional()
        .describe('Whether the photo should be published immediately. Set to false to create an unpublished photo (draft). Defaults to true.')
});

const PageAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    access_token: z.string()
});

const PageAccountsResponseSchema = z.object({
    data: z.array(PageAccountSchema)
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    post_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created photo.'),
    postId: z.string().optional().describe('The ID of the post associated with the photo (if published).')
});

const action = createAction({
    description: 'Publish a photo to a Facebook Page.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_posts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/me/accounts/
        const accountsResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const accountsData = PageAccountsResponseSchema.parse(accountsResponse.data);
        const pageAccount = accountsData.data.find((page) => page.id === input.pageId);

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: 'Page not found in user accounts',
                page_id: input.pageId
            });
        }

        const pageAccessToken = pageAccount.access_token;

        // https://developers.facebook.com/docs/graph-api/reference/page/photos/
        const response = await nango.post({
            endpoint: `/${encodeURIComponent(input.pageId)}/photos`,
            params: {
                access_token: pageAccessToken
            },
            data: {
                url: input.url,
                ...(input.caption !== undefined && { caption: input.caption }),
                ...(input.published !== undefined && { published: input.published })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            ...(providerData.post_id !== undefined && { postId: providerData.post_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
