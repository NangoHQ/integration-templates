import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the forum to update. Example: 5'),
        name: z.string().optional().describe('Name of the forum.'),
        description: z.string().optional().describe('Description of the forum.'),
        forum_category_id: z.number().optional().describe('ID of the category to which this forum belongs.'),
        forum_type: z
            .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
            .optional()
            .describe("Type of forum. 1 = How To's, 2 = Ideas, 3 = Problems, 4 = Announcements."),
        forum_visibility: z
            .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
            .optional()
            .describe('Visibility level of the forum. 1 = Everyone, 2 = Logged in users only, 3 = Agents only, 4 = Users in specific companies only.'),
        company_ids: z.array(z.number()).optional().describe('Company IDs allowed to view the forum when forum_visibility is 4.')
    })
    .describe('Input to update a discussion forum in Freshdesk.');

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
    posts_count: z.number().optional(),
    company_ids: z.array(z.number()).nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the forum.'),
        name: z.string().describe('Name of the forum.'),
        description: z.string().optional().describe('Description of the forum.'),
        position: z.number().describe('Order in which the forum is displayed.'),
        forum_category_id: z.number().describe('ID of the category to which this forum belongs.'),
        forum_type: z.number().describe("Type of forum. 1 = How To's, 2 = Ideas, 3 = Problems, 4 = Announcements."),
        forum_visibility: z
            .number()
            .describe('Visibility level of the forum. 1 = Everyone, 2 = Logged in users only, 3 = Agents only, 4 = Users in specific companies only.'),
        topics_count: z.number().describe('Total number of topics in the forum.'),
        comments_count: z.number().optional().describe('Total number of comments in the forum.'),
        posts_count: z.number().optional().describe('Total number of posts in the forum (legacy field from some API responses).'),
        company_ids: z.array(z.number()).optional().describe('Company IDs allowed to view the forum when forum_visibility is 4.')
    })
    .describe('Output of the updated discussion forum in Freshdesk.');

interface ForumUpdatePayload {
    name?: string;
    description?: string;
    forum_category_id?: number;
    forum_type?: number;
    forum_visibility?: number;
    company_ids?: number[];
}

/**
 * @tags: [write]
 * @tagReason: Updates an existing discussion forum via a PUT request to the Freshdesk API.
 * @pitfalls: The forum_type attribute cannot be updated if the forum already has topics. The company_ids attribute cannot be updated unless the forum_visibility is set to 4.
 */
const action = createAction({
    description: 'Update a discussion forum in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: ForumUpdatePayload = {};

        if (input.name !== undefined) {
            data.name = input.name;
        }
        if (input.description !== undefined) {
            data.description = input.description;
        }
        if (input.forum_category_id !== undefined) {
            data.forum_category_id = input.forum_category_id;
        }
        if (input.forum_type !== undefined) {
            data.forum_type = input.forum_type;
        }
        if (input.forum_visibility !== undefined) {
            data.forum_visibility = input.forum_visibility;
        }
        if (input.company_ids !== undefined) {
            data.company_ids = input.company_ids;
        }

        // https://developers.freshdesk.com/api/#update_forum
        const response = await nango.put({
            endpoint: `/api/v2/discussions/forums/${encodeURIComponent(String(input.id))}`,
            data,
            retries: 3
        });

        const forum = ProviderForumSchema.parse(response.data);

        return {
            id: forum.id,
            name: forum.name,
            ...(forum.description != null && { description: forum.description }),
            position: forum.position,
            forum_category_id: forum.forum_category_id,
            forum_type: forum.forum_type,
            forum_visibility: forum.forum_visibility,
            topics_count: forum.topics_count,
            ...(forum.comments_count !== undefined && { comments_count: forum.comments_count }),
            ...(forum.posts_count !== undefined && { posts_count: forum.posts_count }),
            ...(forum.company_ids != null && { company_ids: forum.company_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
