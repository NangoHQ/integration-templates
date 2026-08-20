import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        category_id: z.number().describe('ID of the discussion category that will contain the new forum. Example: 1'),
        name: z.string().describe('Unique name of the forum. Example: "Ticket Operations"'),
        forum_type: z.number().describe("Type of forum. 1 = How To's, 2 = Ideas, 3 = Problems, 4 = Announcements."),
        forum_visibility: z
            .number()
            .describe('Visibility level. 1 = Everyone, 2 = Logged in users only, 3 = Agents only, 4 = Users in specific companies only.'),
        description: z.string().optional().describe('Description of the forum.'),
        company_ids: z.array(z.number()).optional().describe('Company IDs allowed to view the forum when forum_visibility is 4.')
    })
    .describe('Input payload to create a Freshdesk discussion forum.');

const ProviderForumSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
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
        id: z.number().describe('Unique ID of the created forum.'),
        name: z.string().describe('Name of the forum.'),
        description: z.string().optional().describe('Description of the forum.'),
        position: z.number().describe('Display order of the forum within the category.'),
        forum_category_id: z.number().describe('ID of the category the forum belongs to.'),
        forum_type: z.number().describe('Type of forum.'),
        forum_visibility: z.number().describe('Visibility level of the forum.'),
        topics_count: z.number().describe('Total number of topics in the forum.'),
        comments_count: z.number().optional().describe('Total number of comments in the forum.'),
        posts_count: z.number().optional().describe('Total number of posts in the forum (legacy field from some API responses).'),
        company_ids: z.array(z.number()).optional().describe('Company IDs with access when visibility is company-restricted.')
    })
    .describe('Created Freshdesk discussion forum.');

/**
 * @tags: [write]
 * @tagReason: Creates a new discussion forum in Freshdesk.
 * @pitfalls: Forum names must be unique within the target category or the provider returns a 409 conflict; company_ids is ignored unless forum_visibility is 4.
 */
const action = createAction({
    description: 'Create a discussion forum in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_forum
            endpoint: `/api/v2/discussions/categories/${encodeURIComponent(String(input.category_id))}/forums`,
            data: {
                name: input.name,
                forum_type: input.forum_type,
                forum_visibility: input.forum_visibility,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.company_ids !== undefined && { company_ids: input.company_ids })
            },
            retries: 3
        });

        const providerForum = ProviderForumSchema.parse(response.data);

        return {
            id: providerForum.id,
            name: providerForum.name,
            ...(providerForum.description != null && { description: providerForum.description }),
            position: providerForum.position,
            forum_category_id: providerForum.forum_category_id,
            forum_type: providerForum.forum_type,
            forum_visibility: providerForum.forum_visibility,
            topics_count: providerForum.topics_count,
            ...(providerForum.comments_count !== undefined && { comments_count: providerForum.comments_count }),
            ...(providerForum.posts_count !== undefined && { posts_count: providerForum.posts_count }),
            ...(providerForum.company_ids != null && { company_ids: providerForum.company_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
