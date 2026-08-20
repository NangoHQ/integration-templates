import { z } from 'zod';
import { createAction } from 'nango';

const SeoDataInputSchema = z
    .object({
        meta_title: z.string().optional().describe('SEO meta title for the article.'),
        meta_description: z.string().optional().describe('SEO meta description for the article.'),
        meta_keywords: z.array(z.string()).optional().describe('SEO meta keywords for the article.')
    })
    .describe('SEO metadata for the solution article.');

const InputSchema = z
    .object({
        folder_id: z.number().describe('ID of the folder where the article will be created.'),
        title: z.string().describe('Title of the solution article.'),
        description: z.string().describe('Description of the solution article. May contain HTML.'),
        status: z.number().describe('Status of the solution article. 1 = draft, 2 = published.'),
        seo_data: SeoDataInputSchema.optional().describe('SEO metadata for search engine optimization.'),
        tags: z.array(z.string()).optional().describe('Tags to associate with the solution article.')
    })
    .describe('Input to create a Freshdesk solution article.');

const HierarchyDataSchema = z.object({
    id: z.number().describe('ID of the hierarchy item.'),
    name: z.string().describe('Name of the hierarchy item.'),
    language: z.string().describe('Language code of the hierarchy item.')
});

const HierarchyItemSchema = z.object({
    level: z.number().describe('Depth level in the hierarchy.'),
    type: z.string().describe('Type of hierarchy item, e.g. category or folder.'),
    data: HierarchyDataSchema.describe('Details of the hierarchy item at this level.')
});

const SeoDataOutputSchema = z.object({
    meta_title: z.string().optional().describe('SEO meta title returned by the provider.'),
    meta_description: z.string().optional().describe('SEO meta description returned by the provider.'),
    meta_keywords: z.string().optional().describe('SEO meta keywords returned as a comma-separated string.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the created solution article.'),
        title: z.string().describe('Title of the solution article.'),
        description: z.string().describe('Description of the solution article.'),
        description_text: z.string().optional().describe('Plain-text version of the description.'),
        status: z.number().describe('Status of the solution article. 1 = draft, 2 = published.'),
        agent_id: z.number().optional().describe('ID of the agent who created the article.'),
        type: z.number().optional().describe('Type identifier of the solution article.'),
        category_id: z.number().optional().describe('ID of the category the article belongs to.'),
        folder_id: z.number().optional().describe('ID of the folder the article belongs to.'),
        hierarchy: z.array(HierarchyItemSchema).optional().describe('Parent category and folder hierarchy for the article.'),
        thumbs_up: z.number().optional().describe('Number of upvotes for the article.'),
        thumbs_down: z.number().optional().describe('Number of downvotes for the article.'),
        hits: z.number().optional().describe('Number of views for the article.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the article.'),
        seo_data: SeoDataOutputSchema.optional().describe('SEO metadata returned by the provider.'),
        created_at: z.string().optional().describe('UTC timestamp when the article was created.'),
        updated_at: z.string().optional().describe('UTC timestamp when the article was last updated.')
    })
    .describe('Output representing a created Freshdesk solution article.');

/**
 * @tags: [write]
 * @tagReason: Creates a new solution article in the Freshdesk knowledge base.
 * @pitfalls: The request accepts seo_data.meta_keywords as an array of strings, but the response returns it as a single comma-separated string.
 */
const action = createAction({
    description: 'Create a solution article in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            title: input.title,
            description: input.description,
            status: input.status
        };

        if (input.seo_data !== undefined) {
            data['seo_data'] = input.seo_data;
        }

        if (input.tags !== undefined) {
            data['tags'] = input.tags;
        }

        // https://developers.freshdesk.com/api/#create_solution_article
        const response = await nango.post({
            endpoint: `/api/v2/solutions/folders/${encodeURIComponent(String(input.folder_id))}/articles`,
            data,
            retries: 10
        });

        const article = OutputSchema.parse(response.data);
        return article;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
