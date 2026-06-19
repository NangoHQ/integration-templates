import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('Facebook Page ID to upload the video to. Example: "1148671018324630"'),
    file_url: z.string().describe('URL of the video to upload. Must be a publicly accessible URL. Example: "https://example.com/video.mp4"'),
    title: z.string().optional().describe('Title of the video.'),
    description: z.string().optional().describe('Description or message for the video post.'),
    published: z.boolean().optional().describe('Whether the video should be published immediately. Set to false to create a draft. Defaults to true.')
});

const AccountsResponseSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            access_token: z.string()
        })
    )
});

const ProviderVideoResponseSchema = z.object({
    id: z.string(),
    post_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The video ID.'),
    post_id: z.string().optional().describe('The ID of the post that was created for this video.')
});

const action = createAction({
    description: 'Publish a video to a Facebook Page.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_posts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
        const accountsResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const accountsData = AccountsResponseSchema.parse(accountsResponse.data);
        const page = accountsData.data.find((p) => p.id === input.page_id);

        if (!page) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page with ID "${input.page_id}" not found in your account.`,
                page_id: input.page_id
            });
        }

        const pageAccessToken = page.access_token;

        // https://developers.facebook.com/docs/graph-api/reference/page/videos/
        const uploadResponse = await nango.post({
            endpoint: `/${encodeURIComponent(input.page_id)}/videos`,
            params: {
                access_token: pageAccessToken,
                file_url: input.file_url,
                ...(input.title !== undefined && { title: input.title }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.published !== undefined && { published: input.published.toString() })
            },
            retries: 3
        });

        const videoData = ProviderVideoResponseSchema.parse(uploadResponse.data);

        return {
            id: videoData.id,
            ...(videoData.post_id !== undefined && { post_id: videoData.post_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
