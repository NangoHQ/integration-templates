import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('Facebook Page ID. Example: "1234567890"'),
    limit: z.number().optional().describe('Maximum number of videos to return. Default: 25'),
    fields: z.string().optional().describe('Comma-separated list of fields to return. Example: "id,title,description,created_time,source"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const VideoSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    created_time: z.string().optional(),
    updated_time: z.string().optional(),
    source: z.string().nullable().optional(),
    length: z.number().nullable().optional()
});

const ProviderVideoListSchema = z.object({
    data: z.array(VideoSchema.passthrough()),
    paging: z
        .object({
            cursors: z
                .object({
                    before: z.string().optional(),
                    after: z.string().optional()
                })
                .optional(),
            next: z.string().optional()
        })
        .optional()
});

const VideoOutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    created_time: z.string().optional(),
    updated_time: z.string().optional(),
    source: z.string().optional(),
    length: z.number().optional()
});

const OutputSchema = z.object({
    videos: z.array(VideoOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List videos published on a Facebook Page',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_read_engagement'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/page/videos/
        // First, get the page access token from the user's accounts
        const PageTokenSchema = z.object({ id: z.string(), access_token: z.string() });

        let page: z.infer<typeof PageTokenSchema> | undefined;
        for await (const batch of nango.paginate<z.infer<typeof PageTokenSchema>>({
            // https://developers.facebook.com/docs/graph-api/reference/me/accounts/
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
            const found = batch.find((p) => p.id === input.page_id);
            if (found) {
                page = PageTokenSchema.parse(found);
                break;
            }
        }

        if (!page) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page ${input.page_id} not found or no access token available`
            });
        }

        const params: Record<string, string | number> = {
            access_token: page.access_token
        };

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }

        if (input.cursor !== undefined) {
            params['after'] = input.cursor;
        }

        // https://developers.facebook.com/docs/graph-api/reference/page/videos/
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.page_id)}/videos`,
            params,
            retries: 3
        });

        const parsed = ProviderVideoListSchema.parse(response.data);

        const videos = parsed.data.map((video) => ({
            id: video.id,
            ...(video.title != null && { title: video.title }),
            ...(video.description != null && { description: video.description }),
            ...(video.created_time !== undefined && { created_time: video.created_time }),
            ...(video.updated_time !== undefined && { updated_time: video.updated_time }),
            ...(video.source != null && { source: video.source }),
            ...(video.length != null && { length: video.length })
        }));

        const nextCursor = parsed.paging?.next != null && parsed.paging?.cursors?.after != null ? parsed.paging.cursors.after : undefined;

        return {
            videos,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
