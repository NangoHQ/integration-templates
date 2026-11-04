import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        ig_user_id: z.string().optional().describe('Instagram professional account ID to read stories from. Falls back to the authorized account when omitted.')
    })
    .describe('Connection metadata for selecting the Instagram professional account to sync stories from.');

const ProviderStorySchema = z.object({
    id: z.string(),
    media_type: z.string().optional(),
    media_url: z.string().nullable().optional(),
    permalink: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
    timestamp: z.string().optional(),
    username: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    like_count: z.number().nullable().optional(),
    comments_count: z.number().nullable().optional(),
    shortcode: z.string().nullable().optional(),
    owner: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const StorySchema = z
    .object({
        id: z.string().describe('Instagram media ID of the story.'),
        media_type: z.string().optional().describe('Media type returned by Instagram, such as IMAGE or VIDEO.'),
        media_url: z.string().optional().describe('Direct URL to the story media when Instagram returns one.'),
        permalink: z.string().optional().describe('Permanent Instagram URL for the story.'),
        caption: z.string().optional().describe('Caption attached to the story, when present.'),
        timestamp: z.string().optional().describe('ISO 8601 creation timestamp of the story in UTC.'),
        username: z.string().optional().describe('Instagram username that created the story.'),
        thumbnail_url: z.string().optional().describe('Thumbnail URL for video stories, when provided by Instagram.'),
        like_count: z.number().optional().describe('Number of likes on the story, when returned by Instagram.'),
        comments_count: z.number().optional().describe('Number of comments on the story, when returned by Instagram.'),
        shortcode: z.string().optional().describe('Instagram shortcode for the story media.'),
        owner_id: z.string().optional().describe('Instagram user ID of the story owner, when Instagram returns owner details.')
    })
    .describe('An Instagram story media object.');

const CheckpointSchema = z
    .object({
        cursor: z.string().describe('Cursor for the next stories page when resuming an interrupted full refresh.')
    })
    .describe('Resume cursor for the stories full refresh.');

const sync = createSync({
    description: 'Sync story media for Instagram business or creator accounts in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Story: StorySchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const metadataResult = MetadataSchema.safeParse(connection.metadata ?? {});

        if (!metadataResult.success) {
            throw new Error('Invalid Instagram connection metadata');
        }

        const igUserId = metadataResult.data.ig_user_id;
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const resumeCursor = checkpoint.success ? checkpoint.data.cursor : undefined;
        let nextCursor: string | undefined;

        await nango.trackDeletesStart('Story');

        const fields = [
            'id',
            'media_type',
            'media_url',
            'permalink',
            'caption',
            'timestamp',
            'username',
            'thumbnail_url',
            'like_count',
            'comments_count',
            'shortcode',
            'owner'
        ].join(',');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/stories
            endpoint: igUserId ? `/${encodeURIComponent(igUserId)}/stories` : '/me/stories',
            params: {
                fields,
                ...(resumeCursor ? { after: resumeCursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'paging.cursors.after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' && nextPageParam.length > 0 ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const stories = page.map((item) => {
                const parsed = ProviderStorySchema.safeParse(item);

                if (!parsed.success) {
                    throw new Error(`Failed to parse Instagram story: ${parsed.error.message}`);
                }

                const story = parsed.data;

                return {
                    id: story.id,
                    ...(story.media_type != null && { media_type: story.media_type }),
                    ...(story.media_url != null && { media_url: story.media_url }),
                    ...(story.permalink != null && { permalink: story.permalink }),
                    ...(story.caption != null && { caption: story.caption }),
                    ...(story.timestamp != null && { timestamp: story.timestamp }),
                    ...(story.username != null && { username: story.username }),
                    ...(story.thumbnail_url != null && { thumbnail_url: story.thumbnail_url }),
                    ...(story.like_count != null && { like_count: story.like_count }),
                    ...(story.comments_count != null && { comments_count: story.comments_count }),
                    ...(story.shortcode != null && { shortcode: story.shortcode }),
                    ...(story.owner?.id != null && { owner_id: story.owner.id })
                };
            });

            if (stories.length > 0) {
                await nango.batchSave(stories, 'Story');
            }

            if (nextCursor) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Story');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
