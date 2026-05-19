import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('Facebook Page ID. Example: "1148671018324630"'),
    since: z.string().optional().describe('Unix timestamp or ISO date. Posts created after this time.'),
    until: z.string().optional().describe('Unix timestamp or ISO date. Posts created before this time.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of posts to return per page. Max 100.'),
    fields: z.string().optional().describe('Comma-separated list of fields to include. Example: "id,message,created_time,permalink_url"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PageAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    access_token: z.string()
});

const PageAccountsResponseSchema = z.object({
    data: z.array(PageAccountSchema)
});

const FeedPostSchema = z
    .object({
        id: z.string(),
        message: z.string().optional(),
        created_time: z.string().optional(),
        permalink_url: z.string().optional()
    })
    .passthrough();

const PagingCursorSchema = z.object({
    before: z.string().optional(),
    after: z.string().optional()
});

const PagingSchema = z.object({
    cursors: PagingCursorSchema.optional(),
    next: z.string().optional()
});

const FeedResponseSchema = z.object({
    data: z.array(z.unknown()),
    paging: PagingSchema.optional()
});

const PostSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    createdTime: z.string().optional(),
    permalinkUrl: z.string().optional()
});

const OutputSchema = z.object({
    posts: z.array(PostSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List posts from a Facebook Page feed.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-page-posts',
        group: 'Posts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_show_list', 'pages_read_engagement'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/me/accounts/
        const accountsResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        if (!accountsResponse.data) {
            throw new nango.ActionError({
                type: 'fetch_error',
                message: 'Failed to fetch user pages'
            });
        }

        const accountsResult = PageAccountsResponseSchema.safeParse(accountsResponse.data);
        if (!accountsResult.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse page accounts response'
            });
        }

        const pageAccount = accountsResult.data.data.find((page) => page.id === input.pageId);
        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page with ID ${input.pageId} not found or not accessible`
            });
        }

        const params: Record<string, string | number> = {
            access_token: pageAccount.access_token
        };

        if (input.since !== undefined) {
            params['since'] = input.since;
        }
        if (input.until !== undefined) {
            params['until'] = input.until;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }
        if (input.cursor !== undefined) {
            params['after'] = input.cursor;
        }

        // https://developers.facebook.com/docs/graph-api/reference/page/feed/
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.pageId)}/feed`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'fetch_error',
                message: 'Failed to fetch page feed'
            });
        }

        const feedResult = FeedResponseSchema.safeParse(response.data);
        if (!feedResult.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse feed response'
            });
        }

        const posts: z.infer<typeof PostSchema>[] = [];
        for (const item of feedResult.data.data) {
            const parsed = FeedPostSchema.safeParse(item);
            if (parsed.success) {
                posts.push({
                    id: parsed.data.id,
                    ...(parsed.data.message !== undefined && { message: parsed.data.message }),
                    ...(parsed.data.created_time !== undefined && { createdTime: parsed.data.created_time }),
                    ...(parsed.data.permalink_url !== undefined && { permalinkUrl: parsed.data.permalink_url })
                });
            }
        }

        const nextCursor = feedResult.data.paging?.cursors?.after;

        return {
            posts,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
