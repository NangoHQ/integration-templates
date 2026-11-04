import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ig_user_id: z
            .string()
            .min(1)
            .optional()
            .describe('Instagram professional account ID to list media for. Omit to use the connected account. Example: "27136802592672293"'),
        limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Maximum number of media objects to return per page. Defaults to the provider default when omitted. Example: 25'),
        cursor: z.string().min(1).max(2000).optional().describe('Opaque pagination cursor from a previous response next_cursor. Omit to fetch the first page.')
    })
    .describe('Parameters for listing media published by an Instagram business or creator account.');

const ProviderMediaSchema = z.object({
    id: z.string(),
    caption: z.string().nullable().optional(),
    media_type: z.string().nullable().optional(),
    media_url: z.string().nullable().optional(),
    permalink: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    timestamp: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    like_count: z.number().nullable().optional(),
    comments_count: z.number().nullable().optional()
});

const ProviderPagingSchema = z
    .object({
        cursors: z
            .object({
                before: z.string().nullable().optional(),
                after: z.string().nullable().optional()
            })
            .optional(),
        next: z.string().nullable().optional()
    })
    .optional();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderMediaSchema),
    paging: ProviderPagingSchema
});

const OutputSchema = z
    .object({
        items: z
            .array(
                z.object({
                    id: z.string().describe('Instagram media ID. Example: "17917362834521812"'),
                    caption: z.string().optional().describe('Caption text of the media, when one was set.'),
                    media_type: z.string().optional().describe('Media type returned by Instagram: IMAGE, VIDEO, or CAROUSEL_ALBUM.'),
                    media_url: z.string().optional().describe('URL of the media resource. For carousel albums this is the album cover.'),
                    permalink: z.string().optional().describe('Public Instagram permalink for the media. Example: "https://www.instagram.com/p/DfUpMAMmzpS/"'),
                    thumbnail_url: z.string().optional().describe('Thumbnail URL, typically returned for videos.'),
                    timestamp: z.string().optional().describe('ISO 8601 creation timestamp. Example: "2026-11-04T14:13:03+0000"'),
                    username: z.string().optional().describe('Username of the account that published the media.'),
                    like_count: z.number().optional().describe('Number of likes on the media.'),
                    comments_count: z.number().optional().describe('Number of comments on the media.')
                })
            )
            .describe('Media objects published by the account, newest first.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as cursor for the next page. Omitted when there are no more results.')
    })
    .describe('A page of media published by an Instagram business or creator account.');

/**
 * @tags: [read]
 * @tagReason: Lists published media through a read-only provider GET request and never mutates provider state.
 * @pitfalls: Results are ordered newest-first, and each carousel album is returned as a single CAROUSEL_ALBUM item whose media_url is only the album cover; child media are not included.
 */
const action = createAction({
    description: 'List media published by an Instagram business or creator account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count';
        const path = input.ig_user_id ? `/${encodeURIComponent(input.ig_user_id)}/media` : '/me/media';

        const response = await nango.get({
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
            endpoint: path,
            params: {
                fields,
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((media) => ({
            id: media.id,
            ...(media.caption != null && { caption: media.caption }),
            ...(media.media_type != null && { media_type: media.media_type }),
            ...(media.media_url != null && { media_url: media.media_url }),
            ...(media.permalink != null && { permalink: media.permalink }),
            ...(media.thumbnail_url != null && { thumbnail_url: media.thumbnail_url }),
            ...(media.timestamp != null && { timestamp: media.timestamp }),
            ...(media.username != null && { username: media.username }),
            ...(media.like_count != null && { like_count: media.like_count }),
            ...(media.comments_count != null && { comments_count: media.comments_count })
        }));

        const nextCursor = providerResponse.paging?.next != null ? providerResponse.paging.cursors?.after : undefined;

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
