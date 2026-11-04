import { z } from 'zod';
import { createAction } from 'nango';

const UserTagSchema = z.object({
    username: z.string().describe('Instagram username to tag, without the @ symbol. Example: "nangodev"'),
    x: z.number().describe('Horizontal position of the tag relative to the image width, typically between 0 and 1. Example: 0.5'),
    y: z.number().describe('Vertical position of the tag relative to the image height, typically between 0 and 1. Example: 0.5')
});

const InputSchema = z
    .object({
        ig_user_id: z
            .string()
            .optional()
            .describe(
                'Instagram professional account ID to create the container for. Omit to use the authenticated account (/me). Example: "27136802592672293"'
            ),
        image_url: z.string().optional().describe('Public URL of a JPEG image to upload. Required for image posts and image carousel items.'),
        video_url: z.string().optional().describe('Public URL of a video to upload. Required for video, reel, and video carousel item containers.'),
        media_type: z
            .enum(['IMAGE', 'VIDEO', 'REELS', 'STORIES', 'CAROUSEL'])
            .optional()
            .describe(
                'Container type. Use REELS or STORIES for those formats, VIDEO for a feed video, and CAROUSEL for a carousel parent. Defaults to IMAGE when image_url is provided.'
            ),
        caption: z.string().optional().describe('Caption for the media. Not supported for carousel child containers or stories.'),
        alt_text: z.string().optional().describe('Alternative text for accessibility on image posts.'),
        is_carousel_item: z
            .boolean()
            .optional()
            .describe('Set to true when this container is an item in a carousel; the parent CAROUSEL container references its ID.'),
        children: z
            .array(z.string().describe('Media container ID of a carousel item. Example: "18064105307559401"'))
            .optional()
            .describe('Ordered container IDs of the carousel items. Required when media_type is CAROUSEL.'),
        location_id: z.string().optional().describe('Instagram location page ID to tag in the media. Example: "213385402"'),
        user_tags: z.array(UserTagSchema).optional().describe('Instagram users to tag in the media, each with a username and normalized x/y position.'),
        collaborators: z
            .array(z.string().describe('Instagram username of a collaborator. Example: "nangodev"'))
            .optional()
            .describe('Instagram usernames to invite as collaborators on the post.'),
        cover_url: z.string().optional().describe('Public URL of an image to use as the reel cover. Applies to reels only.'),
        thumb_offset: z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe('Offset in milliseconds of the video frame to use as the thumbnail. Applies to videos and reels.'),
        share_to_feed: z.boolean().optional().describe('Whether a reel should also appear in the account feed.'),
        audio_name: z.string().optional().describe('Name to display for the audio used in a reel.'),
        is_ai_generated: z.boolean().optional().describe('Set to true to self-disclose that the media was generated with AI.')
    })
    .describe('Parameters for creating an Instagram publishing container for an image, video, reel, story, or carousel.');

const ProviderContainerSchema = z.object({
    id: z.string(),
    uri: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the created media container. Pass it to the publish-media-container action to publish it. Example: "18064105307559401"'),
        uri: z
            .string()
            .optional()
            .describe(
                'Resumable upload URI returned for resumable video uploads. Example: "https://rupload.facebook.com/ig-api-upload/v26.0/18064105307559401"'
            )
    })
    .describe('The created Instagram media container ID and optional resumable upload URI.');

/**
 * @tags: [write]
 * @tagReason: Creates a media container on the provider; the container does not become a published post until media_publish is called.
 * @pitfalls: Creating a container does not publish the post; publish it within 24 hours before the container expires. Media URLs must be publicly accessible, carousel children cannot have captions, and video or reel containers may need status polling before they are ready to publish.
 */
const action = createAction({
    description: 'Create an Instagram publishing container for an image, video, reel, or carousel item.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_content_publish'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasMedia = Boolean(input.image_url || input.video_url);

        if (input.media_type === 'CAROUSEL') {
            if (!input.children || input.children.length === 0) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'children is required when media_type is CAROUSEL.'
                });
            }
        } else if (!hasMedia) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide image_url or video_url to create a media container.'
            });
        }

        if (input.video_url && !input.media_type) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'media_type is required when video_url is provided: use VIDEO, REELS, or STORIES.'
            });
        }

        const igUserId = input.ig_user_id ? encodeURIComponent(input.ig_user_id) : 'me';
        const data: Record<string, unknown> = {};

        if (input.image_url !== undefined) {
            data['image_url'] = input.image_url;
        }
        if (input.video_url !== undefined) {
            data['video_url'] = input.video_url;
        }
        if (input.media_type !== undefined) {
            data['media_type'] = input.media_type;
        }
        if (input.caption !== undefined) {
            data['caption'] = input.caption;
        }
        if (input.alt_text !== undefined) {
            data['alt_text'] = input.alt_text;
        }
        if (input.is_carousel_item !== undefined) {
            data['is_carousel_item'] = input.is_carousel_item;
        }
        if (input.children !== undefined) {
            data['children'] = input.children.join(',');
        }
        if (input.location_id !== undefined) {
            data['location_id'] = input.location_id;
        }
        if (input.user_tags !== undefined) {
            data['user_tags'] = input.user_tags;
        }
        if (input.collaborators !== undefined) {
            data['collaborators'] = input.collaborators;
        }
        if (input.cover_url !== undefined) {
            data['cover_url'] = input.cover_url;
        }
        if (input.thumb_offset !== undefined) {
            data['thumb_offset'] = String(input.thumb_offset);
        }
        if (input.share_to_feed !== undefined) {
            data['share_to_feed'] = input.share_to_feed;
        }
        if (input.audio_name !== undefined) {
            data['audio_name'] = input.audio_name;
        }
        if (input.is_ai_generated !== undefined) {
            data['is_ai_generated'] = input.is_ai_generated;
        }

        // https://developers.facebook.com/docs/instagram-platform/content-publishing
        const response = await nango.post({
            endpoint: `/${igUserId}/media`,
            data,
            // A retry after a lost response would create a duplicate container; Instagram has no idempotency key here.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const container = ProviderContainerSchema.parse(response.data);

        return {
            id: container.id,
            ...(container.uri != null && { uri: container.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
