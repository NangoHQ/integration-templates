import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('Facebook Page ID. Example: "1148671018324630"'),
    limit: z.number().optional().describe('Maximum number of scheduled posts to return. Default: 25'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PageAccountSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const ProviderScheduledPostSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    scheduled_publish_time: z.number().optional()
});

const ProviderScheduledPostsResponseSchema = z.object({
    data: z.array(ProviderScheduledPostSchema.passthrough()),
    paging: z
        .object({
            cursors: z
                .object({
                    after: z.string().optional()
                })
                .optional(),
            next: z.string().optional()
        })
        .optional()
});

const ScheduledPostSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    scheduledPublishTime: z.number().optional()
});

const OutputSchema = z.object({
    posts: z.array(ScheduledPostSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List scheduled posts for a Facebook Page',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-page-scheduled-posts',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_posts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/page/scheduled_posts/
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
            const found = batch.find((account) => account.id === input.pageId);
            if (found) {
                pageAccount = PageAccountSchema.parse(found);
                break;
            }
        }

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: 'Page not found in user accounts or user lacks access to this page',
                pageId: input.pageId
            });
        }

        const pageAccessToken = pageAccount.access_token;

        const params: Record<string, string | number> = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['after'] = input.cursor;
        }

        // https://developers.facebook.com/docs/graph-api/reference/page/scheduled_posts/
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.pageId)}/scheduled_posts`,
            params: {
                ...params,
                access_token: pageAccessToken
            },
            retries: 3
        });

        const providerData = ProviderScheduledPostsResponseSchema.parse(response.data);

        const posts = providerData.data.map((post) => {
            const parsed = ProviderScheduledPostSchema.parse(post);
            return {
                id: parsed.id,
                ...(parsed.message !== undefined && { message: parsed.message }),
                ...(parsed.scheduled_publish_time !== undefined && {
                    scheduledPublishTime: parsed.scheduled_publish_time
                })
            };
        });

        const nextCursor = providerData.paging?.next != null && providerData.paging?.cursors?.after != null ? providerData.paging.cursors.after : undefined;

        return {
            posts,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
