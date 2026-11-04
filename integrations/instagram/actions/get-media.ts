import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        media_id: z.string().min(1).describe('The Instagram media ID. Example: "1234567890"')
    })
    .describe('Identifies the Instagram media object to retrieve.');

const ProviderMediaSchema = z.object({
    id: z.string(),
    caption: z.string().nullable().optional(),
    media_type: z.string(),
    media_url: z.string().nullable().optional(),
    permalink: z.string().nullable().optional(),
    timestamp: z.string().nullable().optional(),
    like_count: z.number().nullable().optional(),
    comments_count: z.number().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The Instagram media ID.'),
        caption: z.string().optional().describe('The media caption, omitted when the media has no caption.'),
        media_type: z.string().describe('The media type, such as IMAGE, VIDEO, or CAROUSEL_ALBUM.'),
        media_url: z.string().optional().describe('A signed CDN URL for the media content, omitted when the media has no downloadable URL.'),
        permalink: z.string().optional().describe('The public Instagram permalink for the media.'),
        timestamp: z.string().optional().describe('The media creation time in ISO 8601 format with offset.'),
        like_count: z.number().optional().describe('The number of likes on the media.'),
        comments_count: z.number().optional().describe('The number of comments counted on the media.')
    })
    .describe('A single Instagram media object with its caption, type, URLs, timestamp, and engagement counts.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single Instagram media object without modifying any provider state.
 * @pitfalls: comments_count can include comments authored by the media owner that the comments endpoint does not return; media_url is a time-limited signed CDN URL.
 */
const action = createAction({
    description: 'Retrieve a single Instagram media object.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.facebook.com/docs/instagram-platform/reference/instagram-media
            endpoint: `/${encodeURIComponent(input.media_id)}`,
            params: {
                fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count'
            },
            retries: 3
        });

        const media = ProviderMediaSchema.parse(response.data);

        return {
            id: media.id,
            ...(media.caption != null && { caption: media.caption }),
            media_type: media.media_type,
            ...(media.media_url != null && { media_url: media.media_url }),
            ...(media.permalink != null && { permalink: media.permalink }),
            ...(media.timestamp != null && { timestamp: media.timestamp }),
            ...(media.like_count != null && { like_count: media.like_count }),
            ...(media.comments_count != null && { comments_count: media.comments_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
