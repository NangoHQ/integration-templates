import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        media_id: z.string().min(1).describe('Instagram media ID of the carousel album. Example: "17896450804038745"')
    })
    .describe('Input for listing the child media of an Instagram carousel album.');

const ChildMediaSchema = z.object({
    id: z.string().describe('Instagram media ID of the child item.'),
    media_type: z.string().optional().describe('Media type of the child item, such as "IMAGE" or "VIDEO".'),
    media_url: z.string().optional().describe('Public URL of the child media. Omitted for some video media.'),
    thumbnail_url: z.string().optional().describe('Public URL of the child media thumbnail. Omitted for image media.'),
    permalink: z.string().optional().describe('Permanent Instagram URL of the child media, when available.'),
    timestamp: z.string().optional().describe('ISO 8601 timestamp of when the child media was created.'),
    username: z.string().optional().describe('Instagram username of the account that created the child media.')
});

const OutputSchema = z
    .object({
        children: z.array(ChildMediaSchema).describe('Child media items contained in the carousel album.')
    })
    .describe('Child media items of an Instagram carousel album.');

const ProviderChildMediaSchema = z.object({
    id: z.string(),
    media_type: z.string().nullish(),
    media_url: z.string().nullish(),
    thumbnail_url: z.string().nullish(),
    permalink: z.string().nullish(),
    timestamp: z.string().nullish(),
    username: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderChildMediaSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads child media objects from an existing carousel album without modifying provider data.
 * @pitfalls: Only carousel albums have children; other media types return an empty list rather than an error, and fields such as thumbnail_url for images or media_url for certain videos may be omitted.
 */
const action = createAction({
    description: 'List child media for an Instagram carousel container.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/children
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.media_id)}/children`,
            params: {
                fields: 'id,media_type,media_url,thumbnail_url,permalink,timestamp,username'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            children: parsed.data.map((child) => ({
                id: child.id,
                ...(child.media_type != null && { media_type: child.media_type }),
                ...(child.media_url != null && { media_url: child.media_url }),
                ...(child.thumbnail_url != null && { thumbnail_url: child.thumbnail_url }),
                ...(child.permalink != null && { permalink: child.permalink }),
                ...(child.timestamp != null && { timestamp: child.timestamp }),
                ...(child.username != null && { username: child.username })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
