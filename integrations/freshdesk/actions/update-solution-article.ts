import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the solution article to update. Example: 2'),
        title: z.string().optional().describe('New title of the solution article.'),
        description: z.string().optional().describe('New content of the solution article in HTML format.'),
        status: z.number().optional().describe('Publication status. 1 for draft, 2 for published.'),
        agent_id: z.number().optional().describe('ID of the agent who owns the solution article.'),
        seo_data: z
            .object({
                meta_title: z.string().optional().describe('SEO meta title.'),
                meta_description: z.string().optional().describe('SEO meta description.'),
                meta_keywords: z.array(z.string()).optional().describe('SEO meta keywords. The response returns these as a comma-separated string.')
            })
            .optional()
            .describe('SEO metadata for the article.'),
        tags: z.array(z.string()).optional().describe('Tags to associate with the solution article.')
    })
    .describe('Input to update a solution article in Freshdesk.');

const HierarchyItemDataSchema = z.object({
    id: z.number().describe('ID of the hierarchy item.'),
    name: z.string().describe('Name of the hierarchy item.'),
    language: z.string().describe('Language code of the hierarchy item.')
});

const HierarchyItemSchema = z.object({
    level: z.number().describe('Depth level in the hierarchy.'),
    type: z.string().describe('Type of hierarchy item, such as category or folder.'),
    data: HierarchyItemDataSchema.describe('Details of the hierarchy item.')
});

const ProviderArticleSchema = z.object({
    id: z.number(),
    type: z.number().optional(),
    category_id: z.number().optional(),
    folder_id: z.number().optional(),
    hierarchy: z.array(HierarchyItemSchema).optional(),
    thumbs_up: z.number().optional(),
    thumbs_down: z.number().optional(),
    hits: z.number().optional(),
    tags: z.array(z.string()).optional(),
    seo_data: z.record(z.string(), z.unknown()).optional(),
    agent_id: z.number().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    description_text: z.string().optional(),
    status: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the solution article.'),
        type: z.number().optional().describe('Type of the solution article.'),
        category_id: z.number().optional().describe('ID of the parent category.'),
        folder_id: z.number().optional().describe('ID of the parent folder.'),
        hierarchy: z.array(HierarchyItemSchema).optional().describe('Hierarchy path of the article through categories and folders.'),
        thumbs_up: z.number().optional().describe('Number of positive votes.'),
        thumbs_down: z.number().optional().describe('Number of negative votes.'),
        hits: z.number().optional().describe('Number of views.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the article.'),
        seo_data: z.record(z.string(), z.unknown()).optional().describe('SEO metadata associated with the article.'),
        agent_id: z.number().optional().describe('ID of the agent who created the article.'),
        title: z.string().optional().describe('Title of the solution article.'),
        description: z.string().optional().describe('Content of the article in HTML format.'),
        description_text: z.string().optional().describe('Content of the article in plain text.'),
        status: z.number().optional().describe('Publication status. 1 for draft, 2 for published.'),
        created_at: z.string().optional().describe('Timestamp when the article was created.'),
        updated_at: z.string().optional().describe('Timestamp when the article was last updated.')
    })
    .describe('Updated solution article from Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Mutates the solution article on the provider by updating its fields.
 * @pitfalls: Passing only status as 1 unpublishes the article without altering other fields.
 */
const action = createAction({
    description: 'Update a solution article in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_solution_article
            endpoint: `/api/v2/solutions/articles/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.agent_id !== undefined && { agent_id: input.agent_id }),
                ...(input.seo_data !== undefined && { seo_data: input.seo_data }),
                ...(input.tags !== undefined && { tags: input.tags })
            },
            retries: 10
        });

        const article = ProviderArticleSchema.parse(response.data);

        return {
            id: article.id,
            ...(article.type !== undefined && { type: article.type }),
            ...(article.category_id !== undefined && { category_id: article.category_id }),
            ...(article.folder_id !== undefined && { folder_id: article.folder_id }),
            ...(article.hierarchy !== undefined && { hierarchy: article.hierarchy }),
            ...(article.thumbs_up !== undefined && { thumbs_up: article.thumbs_up }),
            ...(article.thumbs_down !== undefined && { thumbs_down: article.thumbs_down }),
            ...(article.hits !== undefined && { hits: article.hits }),
            ...(article.tags !== undefined && { tags: article.tags }),
            ...(article.seo_data !== undefined && { seo_data: article.seo_data }),
            ...(article.agent_id !== undefined && { agent_id: article.agent_id }),
            ...(article.title !== undefined && { title: article.title }),
            ...(article.description !== undefined && { description: article.description }),
            ...(article.description_text !== undefined && { description_text: article.description_text }),
            ...(article.status !== undefined && { status: article.status }),
            ...(article.created_at !== undefined && { created_at: article.created_at }),
            ...(article.updated_at !== undefined && { updated_at: article.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
