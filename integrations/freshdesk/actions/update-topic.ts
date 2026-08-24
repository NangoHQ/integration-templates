import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the discussion topic to update. Example: 3'),
        forum_id: z
            .number()
            .optional()
            .describe('ID of the Forum in which this topic is present. Can only be changed by users with forum management privileges.'),
        locked: z.boolean().optional().describe('Set to true if the topic is locked, which means no more posts can be added.'),
        message: z.string().optional().describe('Message body of the topic. If included, the first comment/post of the topic will be updated.'),
        stamp_type: z
            .number()
            .optional()
            .describe(
                'Stamp type given to the topic. Valid values depend on the forum type: Question (6=Answered, 7=Unanswered), Idea (1=Planned, 2=Implemented, 3=Not Taken, 4=In Progress, 5=Deferred), Problem (8=Solved, 9=Unsolved), Announcement (nil).'
            ),
        sticky: z.boolean().optional().describe('Set to true if the topic should stay on top of the forum for additional visibility.'),
        title: z.string().optional().describe('Title of the topic.')
    })
    .describe('Input for updating a discussion forum topic in Freshdesk.');

const ProviderTopicSchema = z.object({
    id: z.number(),
    title: z.string(),
    forum_id: z.number(),
    user_id: z.number(),
    locked: z.boolean(),
    published: z.boolean(),
    stamp_type: z.number().nullable(),
    replied_by: z.number(),
    comments_count: z.number(),
    hits: z.number(),
    user_votes: z.number(),
    merged_topic_id: z.number().nullable(),
    sticky: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    replied_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the topic.'),
        title: z.string().describe('Title of the discussion topic.'),
        forum_id: z.number().describe('ID of the forum the topic belongs to.'),
        user_id: z.number().describe('ID of the user who created the topic.'),
        locked: z.boolean().describe('Whether the topic is locked.'),
        published: z.boolean().describe('Whether the topic is published.'),
        stamp_type: z.number().optional().describe('Stamp type for the topic.'),
        replied_by: z.number().describe('ID of the user who last replied to the topic.'),
        comments_count: z.number().describe('Number of comments in the topic.'),
        hits: z.number().describe('Number of views for the topic.'),
        user_votes: z.number().describe('Number of votes by the current user.'),
        merged_topic_id: z.number().optional().describe('If merged, the ID of the topic it was merged into.'),
        sticky: z.boolean().describe('Whether the topic is marked as sticky.'),
        created_at: z.string().describe('ISO 8601 timestamp when the topic was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the topic was last updated.'),
        replied_at: z.string().describe('ISO 8601 timestamp when the last reply was made.')
    })
    .describe('Output representing the updated discussion forum topic.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing discussion forum topic, which may also update its first comment if message is provided.
 * @pitfalls: Sending "message" overwrites the topic's first comment, and updating "forum_id" requires forum management privileges.
 */
const action = createAction({
    description: 'Update a discussion forum topic in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_topic
            endpoint: `/api/v2/discussions/topics/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.forum_id !== undefined && { forum_id: input.forum_id }),
                ...(input.locked !== undefined && { locked: input.locked }),
                ...(input.message !== undefined && { message: input.message }),
                ...(input.stamp_type !== undefined && { stamp_type: input.stamp_type }),
                ...(input.sticky !== undefined && { sticky: input.sticky }),
                ...(input.title !== undefined && { title: input.title })
            },
            retries: 3
        });

        const providerTopic = ProviderTopicSchema.parse(response.data);

        return {
            id: providerTopic.id,
            title: providerTopic.title,
            forum_id: providerTopic.forum_id,
            user_id: providerTopic.user_id,
            locked: providerTopic.locked,
            published: providerTopic.published,
            ...(providerTopic.stamp_type != null && { stamp_type: providerTopic.stamp_type }),
            replied_by: providerTopic.replied_by,
            comments_count: providerTopic.comments_count,
            hits: providerTopic.hits,
            user_votes: providerTopic.user_votes,
            ...(providerTopic.merged_topic_id != null && { merged_topic_id: providerTopic.merged_topic_id }),
            sticky: providerTopic.sticky,
            created_at: providerTopic.created_at,
            updated_at: providerTopic.updated_at,
            replied_at: providerTopic.replied_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
