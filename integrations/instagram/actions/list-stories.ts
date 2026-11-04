import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().min(1).regex(/^\S+$/).optional().describe('Instagram professional account user ID. Defaults to the authenticated account ("me").'),
        cursor: z.string().min(1).regex(/^\S+$/).optional().describe('Opaque pagination cursor from a previous response. Omit to fetch the first page.'),
        limit: z.number().int().positive().optional().describe('Maximum number of stories to return per page.')
    })
    .describe('Filters for listing story media for an Instagram account.');

const StoryMediaSchema = z.object({
    id: z.string(),
    media_type: z.string().nullish(),
    media_url: z.string().nullish(),
    thumbnail_url: z.string().nullish(),
    permalink: z.string().nullish(),
    caption: z.string().nullish(),
    timestamp: z.string().nullish(),
    username: z.string().nullish()
});

const PagingSchema = z.object({
    next: z.string().nullish(),
    cursors: z
        .object({
            before: z.string().nullish(),
            after: z.string().nullish()
        })
        .nullish()
});

const StoriesResponseSchema = z.object({
    data: z.array(StoryMediaSchema),
    paging: PagingSchema.nullish()
});

const OutputSchema = z
    .object({
        stories: z
            .array(
                z.object({
                    id: z.string().describe('Instagram media ID.'),
                    media_type: z.string().optional().describe('Type of media, such as IMAGE or VIDEO.'),
                    media_url: z.string().optional().describe('URL of the story media. May be omitted for some video media.'),
                    thumbnail_url: z.string().optional().describe('URL of the story thumbnail, only available for video media.'),
                    permalink: z.string().optional().describe('Permanent URL to the story media.'),
                    caption: z.string().optional().describe('Caption text for the story, if any.'),
                    timestamp: z.string().optional().describe('ISO 8601 creation timestamp of the story.'),
                    username: z.string().optional().describe('Username of the account that created the story.')
                })
            )
            .describe('Story media objects for the account.'),
        next_cursor: z.string().optional().describe('Cursor to pass as "cursor" to fetch the next page of stories.')
    })
    .describe('A page of Instagram stories and the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Reads story media from the provider without modifying any data.
 * @pitfalls: Only stories from the last 24 hours are returned, live video and reshared stories are excluded, and media_url may be omitted for video with copyrighted or licensed audio.
 */
const action = createAction({
    description: 'List story media for an Instagram business or creator account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.user_id === undefined ? 'me' : input.user_id;

        const config: ProxyConfiguration = {
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/stories
            endpoint: `/${encodeURIComponent(userId)}/stories`,
            params: {
                fields: 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,username',
                ...(input.cursor !== undefined && { after: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = StoriesResponseSchema.parse(response.data);

        const nextCursor = parsed.paging?.next != null ? parsed.paging.cursors?.after : undefined;

        return {
            stories: parsed.data.map((story) => ({
                id: story.id,
                ...(story.media_type != null && { media_type: story.media_type }),
                ...(story.media_url != null && { media_url: story.media_url }),
                ...(story.thumbnail_url != null && { thumbnail_url: story.thumbnail_url }),
                ...(story.permalink != null && { permalink: story.permalink }),
                ...(story.caption != null && { caption: story.caption }),
                ...(story.timestamp != null && { timestamp: story.timestamp }),
                ...(story.username != null && { username: story.username })
            })),
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
