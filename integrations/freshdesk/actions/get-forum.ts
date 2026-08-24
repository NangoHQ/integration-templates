import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Forum ID. Example: 5')
    })
    .describe('Input to retrieve a single Freshdesk discussion forum by ID.');

const ProviderForumSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    position: z.number(),
    forum_category_id: z.number(),
    forum_type: z.number(),
    forum_visibility: z.number(),
    topics_count: z.number(),
    comments_count: z.number().optional(),
    posts_count: z.number().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the forum.'),
        name: z.string().describe('Name of the forum.'),
        description: z.string().optional().describe('Description of the forum.'),
        position: z.number().describe('Position of the forum in the category listing.'),
        forum_category_id: z.number().describe('ID of the parent forum category.'),
        forum_type: z.number().describe('Type of the forum.'),
        forum_visibility: z.number().describe('Visibility level of the forum.'),
        topics_count: z.number().describe('Number of topics in the forum.'),
        comments_count: z.number().optional().describe('Total number of comments in the forum.'),
        posts_count: z.number().optional().describe('Number of posts in the forum (legacy field from some API responses).')
    })
    .describe('A single Freshdesk discussion forum returned by the provider.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single discussion forum by ID without modifying any provider data.
 */
const action = createAction({
    description: 'Retrieve a single discussion forum from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_a_forum
            endpoint: `/api/v2/discussions/forums/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Forum not found',
                id: input.id
            });
        }

        const raw = ProviderForumSchema.parse(response.data);

        return {
            id: raw.id,
            name: raw.name,
            ...(raw.description != null && { description: raw.description }),
            position: raw.position,
            forum_category_id: raw.forum_category_id,
            forum_type: raw.forum_type,
            forum_visibility: raw.forum_visibility,
            topics_count: raw.topics_count,
            ...(raw.comments_count !== undefined && { comments_count: raw.comments_count }),
            ...(raw.posts_count !== undefined && { posts_count: raw.posts_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
