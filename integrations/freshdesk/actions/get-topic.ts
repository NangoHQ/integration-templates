import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the topic to retrieve. Example: 3')
    })
    .describe('Input to retrieve a single discussion forum topic');

const ProviderTopicSchema = z.object({
    id: z.number(),
    title: z.string(),
    forum_id: z.number(),
    user_id: z.number(),
    locked: z.boolean(),
    published: z.boolean().optional(),
    stamp_type: z.number().nullable().optional(),
    replied_by: z.number(),
    posts_count: z.number().optional(),
    comments_count: z.number().optional(),
    hits: z.number(),
    user_votes: z.number(),
    merged_topic_id: z.number().nullable().optional(),
    sticky: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    replied_at: z.string(),
    message: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the topic'),
        title: z.string().describe('Title of the topic'),
        forum_id: z.number().describe('ID of the forum in which this topic is present'),
        user_id: z.number().describe('ID of the user who created the topic'),
        locked: z.boolean().describe('Whether the topic is locked so no more posts can be added'),
        published: z.boolean().optional().describe('Whether the topic is published'),
        stamp_type: z.number().optional().describe('Stamp type given to the topic'),
        replied_by: z.number().describe('ID of the user who made the latest comment in the topic'),
        posts_count: z.number().optional().describe('Number of posts in the topic'),
        comments_count: z.number().optional().describe('Number of comments in the topic'),
        hits: z.number().describe('Number of views of the topic'),
        user_votes: z.number().describe('Number of votes in the topic'),
        merged_topic_id: z.number().optional().describe('ID of the topic to which this topic is merged'),
        sticky: z.boolean().describe('Whether the topic stays on top of the forum for additional visibility'),
        created_at: z.string().describe('Topic creation timestamp in UTC'),
        updated_at: z.string().describe('Topic updated timestamp in UTC'),
        replied_at: z.string().describe('Timestamp of the latest comment in the topic'),
        message: z.string().optional().describe('Message body of the topic')
    })
    .describe('A single discussion forum topic from Freshdesk');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single discussion forum topic from Freshdesk without mutating provider data.
 * @pitfalls: The live API returns comments_count instead of the documented posts_count and omits the message body from GET responses despite listing it as a topic attribute.
 */
const action = createAction({
    description: 'Retrieve a single discussion forum topic from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_a_topic
            endpoint: `/api/v2/discussions/topics/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Topic with id ${input.id} not found`
            });
        }

        const providerTopic = ProviderTopicSchema.parse(response.data);

        return {
            id: providerTopic.id,
            title: providerTopic.title,
            forum_id: providerTopic.forum_id,
            user_id: providerTopic.user_id,
            locked: providerTopic.locked,
            ...(providerTopic.published !== undefined && { published: providerTopic.published }),
            ...(providerTopic.stamp_type != null && { stamp_type: providerTopic.stamp_type }),
            replied_by: providerTopic.replied_by,
            ...(providerTopic.posts_count !== undefined && { posts_count: providerTopic.posts_count }),
            ...(providerTopic.comments_count !== undefined && { comments_count: providerTopic.comments_count }),
            hits: providerTopic.hits,
            user_votes: providerTopic.user_votes,
            ...(providerTopic.merged_topic_id != null && { merged_topic_id: providerTopic.merged_topic_id }),
            sticky: providerTopic.sticky,
            created_at: providerTopic.created_at,
            updated_at: providerTopic.updated_at,
            replied_at: providerTopic.replied_at,
            ...(providerTopic.message !== undefined && { message: providerTopic.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
