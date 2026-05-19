import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        pageId: z.string().describe('Facebook Page ID to post to. Example: "1148671018324630"'),
        message: z.string().optional().describe('The message content of the post.'),
        link: z.string().optional().describe('URL to share in the post.'),
        published: z.boolean().optional().describe('Whether to publish immediately (true) or schedule (false). Default: true'),
        scheduledPublishTime: z.number().optional().describe('Unix timestamp for scheduled post publishing. Required if published=false.')
    })
    .superRefine((data, ctx) => {
        if (data.published === false && data.scheduledPublishTime === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'scheduledPublishTime is required when published is false',
                path: ['scheduledPublishTime']
            });
        }
    });

const PageAccountSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const ProviderPostResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created post.')
});

const action = createAction({
    description: 'Publish a post to a Facebook Page feed.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-page-post',
        group: 'Page Posts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_posts', 'pages_show_list'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/me/accounts/
        let pageAccount: z.infer<typeof PageAccountSchema> | undefined;
        for await (const batch of nango.paginate<z.infer<typeof PageAccountSchema>>({
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
            const found = batch.find((page) => page.id === input.pageId);
            if (found) {
                pageAccount = PageAccountSchema.parse(found);
                break;
            }
        }

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page ${input.pageId} not found or user does not have access to this page.`,
                pageId: input.pageId
            });
        }

        const pageAccessToken = pageAccount.access_token;

        const postData: Record<string, string | number | boolean> = {};

        if (input.message !== undefined) {
            postData['message'] = input.message;
        }

        if (input.link !== undefined) {
            postData['link'] = input.link;
        }

        if (input.published !== undefined) {
            postData['published'] = input.published;
        }

        if (input.scheduledPublishTime !== undefined) {
            postData['scheduled_publish_time'] = input.scheduledPublishTime;
        }

        const postConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/graph-api/reference/page/feed#publish
            endpoint: `/${encodeURIComponent(input.pageId)}/feed`,
            params: {
                access_token: pageAccessToken,
                ...postData
            },
            retries: 1
        };

        const postResponse = await nango.post(postConfig);
        const postResult = ProviderPostResponseSchema.parse(postResponse.data);

        return {
            id: postResult.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
