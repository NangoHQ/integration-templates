import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MEDIA_FIELDS = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'permalink',
    'thumbnail_url',
    'timestamp',
    'username',
    'comments_count',
    'like_count',
    'is_comment_enabled',
    'children{id,media_type,media_url,thumbnail_url}'
].join(',');

const MediaChildSchema = z
    .object({
        id: z.string().describe('Unique identifier of the carousel child media object.'),
        media_type: z.string().optional().describe('Type of the carousel child media, such as IMAGE or VIDEO.'),
        media_url: z.string().optional().describe('Signed URL for the carousel child image or video file.'),
        thumbnail_url: z.string().optional().describe('Signed URL for the carousel child video thumbnail.')
    })
    .describe('A single item within an Instagram carousel album.');

const MediaChildrenSchema = z
    .object({
        data: z.array(MediaChildSchema).describe('Carousel child media objects returned by Instagram.')
    })
    .describe('Carousel children returned for a CAROUSEL_ALBUM media object.');

const MediaSchema = z
    .object({
        id: z.string().describe('Unique Instagram media identifier.'),
        caption: z.string().optional().describe('Caption text attached to the media.'),
        media_type: z.string().optional().describe('Instagram media type, such as IMAGE, VIDEO, or CAROUSEL_ALBUM.'),
        media_url: z.string().optional().describe('Signed URL for the image or video file.'),
        permalink: z.string().optional().describe('Public Instagram permalink for the media.'),
        thumbnail_url: z.string().optional().describe('Signed URL for the video thumbnail image.'),
        timestamp: z.string().optional().describe('Publication timestamp reported by Instagram.'),
        username: z.string().optional().describe('Instagram username that published the media.'),
        comments_count: z.number().optional().describe('Number of comments on the media.'),
        like_count: z.number().optional().describe('Number of likes on the media.'),
        is_comment_enabled: z.boolean().optional().describe('Whether comments are enabled for the media.'),
        children: MediaChildrenSchema.optional().describe('Carousel child media when the post is a CAROUSEL_ALBUM.')
    })
    .describe('An Instagram media object published by the connected business or creator account.');

const MetadataSchema = z
    .object({
        ig_user_id: z.string().optional().describe('Instagram professional account ID to sync when it is stored in connection metadata.'),
        user_id: z.string().optional().describe('Alternate Instagram professional account ID used when ig_user_id is not set.')
    })
    .describe('Connection metadata that can pin this sync to a specific Instagram professional account.');

const CheckpointSchema = z
    .object({
        updated_after: z.string().describe('Newest media timestamp already synced, used as the incremental since filter.'),
        cursor: z.string().describe('Instagram media edge cursor used to resume an in-progress scan.'),
        newest_timestamp: z.string().describe('Newest media timestamp observed during the current scan.')
    })
    .describe('Incremental media sync checkpoint.');

const StoredCheckpointSchema = z.object({
    updated_after: z.string().optional(),
    cursor: z.string().optional(),
    newest_timestamp: z.string().optional()
});

const MeSchema = z.object({
    id: z.string()
});

const ProviderMediaChildSchema = z.object({
    id: z.string(),
    media_type: z.string().nullish(),
    media_url: z.string().nullish(),
    thumbnail_url: z.string().nullish()
});

const ProviderMediaSchema = z.object({
    id: z.string(),
    caption: z.string().nullish(),
    media_type: z.string().nullish(),
    media_url: z.string().nullish(),
    permalink: z.string().nullish(),
    thumbnail_url: z.string().nullish(),
    timestamp: z.string().nullish(),
    username: z.string().nullish(),
    comments_count: z.number().nullish(),
    like_count: z.number().nullish(),
    is_comment_enabled: z.boolean().nullish(),
    children: z
        .object({
            data: z.array(ProviderMediaChildSchema)
        })
        .nullish()
});

function toMillis(timestamp: string | null | undefined): number | undefined {
    if (!timestamp) {
        return undefined;
    }

    const millis = Date.parse(timestamp);
    return Number.isNaN(millis) ? undefined : millis;
}

function normalizeMedia(media: z.infer<typeof ProviderMediaSchema>): z.infer<typeof MediaSchema> {
    return {
        id: media.id,
        ...(media.caption != null ? { caption: media.caption } : {}),
        ...(media.media_type != null ? { media_type: media.media_type } : {}),
        ...(media.media_url != null ? { media_url: media.media_url } : {}),
        ...(media.permalink != null ? { permalink: media.permalink } : {}),
        ...(media.thumbnail_url != null ? { thumbnail_url: media.thumbnail_url } : {}),
        ...(media.timestamp != null ? { timestamp: media.timestamp } : {}),
        ...(media.username != null ? { username: media.username } : {}),
        ...(media.comments_count != null ? { comments_count: media.comments_count } : {}),
        ...(media.like_count != null ? { like_count: media.like_count } : {}),
        ...(media.is_comment_enabled != null ? { is_comment_enabled: media.is_comment_enabled } : {}),
        ...(media.children != null
            ? {
                  children: {
                      data: media.children.data.map((child) => ({
                          id: child.id,
                          ...(child.media_type != null ? { media_type: child.media_type } : {}),
                          ...(child.media_url != null ? { media_url: child.media_url } : {}),
                          ...(child.thumbnail_url != null ? { thumbnail_url: child.thumbnail_url } : {})
                      }))
                  }
              }
            : {})
    };
}

const sync = createSync({
    description: 'Sync media published by Instagram business or creator accounts in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Media: MediaSchema
    },
    scopes: ['instagram_business_basic'],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const metadata = MetadataSchema.safeParse(connection.metadata ?? {});
        let igUserId = metadata.success ? (metadata.data.ig_user_id ?? metadata.data.user_id) : undefined;

        if (!igUserId) {
            const meResponse = await nango.get<unknown>({
                // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user
                endpoint: '/me',
                params: {
                    fields: 'id'
                },
                retries: 3
            });

            igUserId = MeSchema.parse(meResponse.data).id;
        }

        const checkpoint = StoredCheckpointSchema.safeParse(await nango.getCheckpoint());
        const savedCheckpoint = checkpoint.success ? checkpoint.data : {};
        const updatedAfter = savedCheckpoint.updated_after || undefined;
        const resumeCursor = savedCheckpoint.cursor || undefined;

        let newestTimestamp = savedCheckpoint.newest_timestamp || updatedAfter;
        let newestTimestampMillis = toMillis(newestTimestamp);
        let nextCursor: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
            endpoint: `/${encodeURIComponent(igUserId)}/media`,
            params: {
                fields: MEDIA_FIELDS,
                ...(updatedAfter ? { since: updatedAfter } : {}),
                ...(resumeCursor ? { after: resumeCursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'paging.cursors.after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' && nextPageParam.length > 0 ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const media = page.map((item) => normalizeMedia(ProviderMediaSchema.parse(item)));

            if (media.length > 0) {
                await nango.batchSave(media, 'Media');
            }

            for (const item of media) {
                const itemMillis = toMillis(item.timestamp);

                if (itemMillis !== undefined && (newestTimestampMillis === undefined || itemMillis > newestTimestampMillis)) {
                    newestTimestampMillis = itemMillis;
                    newestTimestamp = item.timestamp;
                }
            }

            if (nextCursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    cursor: nextCursor,
                    newest_timestamp: newestTimestamp ?? ''
                });
            }
        }

        if (newestTimestamp) {
            await nango.saveCheckpoint({ updated_after: newestTimestamp, cursor: '', newest_timestamp: newestTimestamp });
        } else {
            await nango.clearCheckpoint();
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
