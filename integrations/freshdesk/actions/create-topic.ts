import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        forum_id: z.number().describe('ID of the forum in which to create the topic. Example: 5'),
        title: z.string().describe('Title of the topic. Example: "how to create a custom field"'),
        message: z.string().describe('Message body of the topic. This will be added as the first comment/post.'),
        sticky: z.boolean().optional().describe('Set to true if the topic should stay on top of the forum for additional visibility.'),
        locked: z.boolean().optional().describe('Set to true if the topic is locked, which means no more posts can be added.'),
        stamp_type: z.number().optional().describe('Stamp type given to the topic. Valid values depend on the forum type.')
    })
    .describe('Input for creating a discussion forum topic in Freshdesk.');

const ProviderTopicSchema = z.object({
    id: z.number(),
    title: z.string(),
    forum_id: z.number(),
    user_id: z.number(),
    locked: z.boolean(),
    published: z.boolean(),
    stamp_type: z.number().nullable(),
    replied_by: z.number(),
    posts_count: z.number().optional(),
    comments_count: z.number().optional(),
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
        id: z.number().describe('Unique identifier of the created topic.'),
        title: z.string().describe('Title of the topic.'),
        forum_id: z.number().describe('ID of the forum the topic belongs to.'),
        user_id: z.number().describe('ID of the user who created the topic.'),
        locked: z.boolean().describe('Whether the topic is locked.'),
        published: z.boolean().describe('Whether the topic is published.'),
        stamp_type: z.number().nullable().describe('Stamp type on the topic, or null if none.'),
        replied_by: z.number().describe('User ID of the last replier.'),
        posts_count: z.number().describe('Number of posts in the topic.'),
        hits: z.number().describe('Number of views for the topic.'),
        user_votes: z.number().describe('Number of user votes.'),
        merged_topic_id: z.number().nullable().describe('If merged, the destination topic ID; otherwise null.'),
        sticky: z.boolean().describe('Whether the topic is sticky (pinned).'),
        created_at: z.string().describe('ISO 8601 timestamp when the topic was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the topic was last updated.'),
        replied_at: z.string().describe('ISO 8601 timestamp when the last reply was made.')
    })
    .describe('Output of a newly created discussion forum topic in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new discussion forum topic in Freshdesk.
 * @pitfalls: sticky and locked are silently ignored without topic-update privileges; omitting stamp_type causes the provider to assign a default based on the forum type.
 */
const action = createAction({
    description: 'Create a discussion forum topic in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_topic
            endpoint: `/api/v2/discussions/forums/${encodeURIComponent(input.forum_id)}/topics`,
            data: {
                title: input.title,
                message: input.message,
                ...(input.sticky !== undefined && { sticky: input.sticky }),
                ...(input.locked !== undefined && { locked: input.locked }),
                ...(input.stamp_type !== undefined && { stamp_type: input.stamp_type })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const topic = ProviderTopicSchema.parse(response.data);

        return {
            id: topic.id,
            title: topic.title,
            forum_id: topic.forum_id,
            user_id: topic.user_id,
            locked: topic.locked,
            published: topic.published,
            stamp_type: topic.stamp_type,
            replied_by: topic.replied_by,
            posts_count: topic.posts_count ?? topic.comments_count ?? 0,
            hits: topic.hits,
            user_votes: topic.user_votes,
            merged_topic_id: topic.merged_topic_id,
            sticky: topic.sticky,
            created_at: topic.created_at,
            updated_at: topic.updated_at,
            replied_at: topic.replied_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
