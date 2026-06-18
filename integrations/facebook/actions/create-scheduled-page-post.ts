import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('Facebook Page ID to post on. Example: "123456789012345"'),
    message: z.string().optional().describe('The message text for the post'),
    scheduled_publish_time: z
        .number()
        .describe('Unix timestamp when the post should be published. Must be at least 10 minutes and at most 6 months in the future.'),
    link: z.string().optional().describe('URL to attach to the post'),
    photo_url: z.string().optional().describe('URL of a photo to attach to the post')
});

const PageAccountSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const ProviderPostResponseSchema = z.object({
    id: z.string(),
    post_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the scheduled post'),
    post_id: z.string().optional().describe('The post ID (if immediately published)')
});

const action = createAction({
    description: 'Schedule a future post on a Facebook Page',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_posts'],

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
            const found = batch.find((account) => account.id === input.page_id);
            if (found) {
                pageAccount = PageAccountSchema.parse(found);
                break;
            }
        }

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: 'Page not found in user accounts or user does not have permission to manage this page',
                page_id: input.page_id
            });
        }

        let response;

        if (input.photo_url !== undefined) {
            // Photo posts must go to the /photos edge, not /feed
            // https://developers.facebook.com/docs/graph-api/reference/page/photos/#Creating
            const photoData: Record<string, string | number | boolean> = {
                url: input.photo_url,
                published: false,
                scheduled_publish_time: input.scheduled_publish_time
            };
            if (input.message !== undefined) {
                photoData['caption'] = input.message;
            }
            response = await nango.post({
                endpoint: `/${encodeURIComponent(input.page_id)}/photos`,
                params: { access_token: pageAccount.access_token },
                data: photoData,
                retries: 3
            });
        } else {
            // https://developers.facebook.com/docs/graph-api/reference/page/feed/#publishing
            const postData: Record<string, string | number | boolean> = {
                published: false,
                scheduled_publish_time: input.scheduled_publish_time
            };
            if (input.message !== undefined) {
                postData['message'] = input.message;
            }
            if (input.link !== undefined) {
                postData['link'] = input.link;
            }
            response = await nango.post({
                endpoint: `/${encodeURIComponent(input.page_id)}/feed`,
                params: { access_token: pageAccount.access_token },
                data: postData,
                retries: 3
            });
        }

        const parsedResponse = ProviderPostResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse post creation response'
            });
        }

        return {
            id: parsedResponse.data.id,
            ...(parsedResponse.data.post_id !== undefined && { post_id: parsedResponse.data.post_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
