import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageSize: z.number().int().min(1).max(1000).optional().describe('The maximum number of cached contents to return. Maximum is 1000.'),
    pageToken: z.string().optional().describe('A page token from a previous cachedContents.list call to retrieve the subsequent page.')
});

const CachedContentSchema = z
    .object({
        name: z.string(),
        displayName: z.string().optional(),
        model: z.string().optional(),
        createTime: z.string().optional(),
        updateTime: z.string().optional(),
        expireTime: z.string().optional(),
        ttl: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CachedContentSchema),
    next_page_token: z.string().optional()
});

const action = createAction({
    description: 'List cached content entries (context cache) with pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.pageToken !== undefined) {
            params['pageToken'] = input.pageToken;
        }

        const response = await nango.get({
            // https://ai.google.dev/api/caching#v1beta.cachedContents.list
            endpoint: '/v1beta/cachedContents',
            params,
            retries: 3
        });

        const listSchema = z.object({
            cachedContents: z.array(z.unknown()).optional(),
            nextPageToken: z.string().optional()
        });

        const parsed = listSchema.parse(response.data);

        const items = (parsed.cachedContents || []).map((item) => {
            return CachedContentSchema.parse(item);
        });

        return {
            items,
            ...(parsed.nextPageToken != null && { next_page_token: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
