import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution article. Example: 2')
    })
    .describe('Input to retrieve a single solution article from Freshdesk.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution article.'),
        type: z.number().optional().describe('Type of the solution article.'),
        category_id: z.number().describe('ID of the category to which the solution article belongs.'),
        folder_id: z.number().describe('ID of the folder to which the solution article belongs.'),
        hierarchy: z
            .array(
                z.object({
                    level: z.number().describe('Depth level in the hierarchy. 0 is the top-level category.'),
                    type: z.string().describe('Type of the hierarchy item. Examples: "category", "folder".'),
                    data: z
                        .object({
                            id: z.number().describe('ID of the category or folder.'),
                            name: z.string().describe('Name of the category or folder.'),
                            language: z.string().describe('Language code of the category or folder. Example: "en".')
                        })
                        .describe('Details of the hierarchy item.')
                })
            )
            .describe('Parent category and folders in which the article is placed.'),
        thumbs_up: z.number().describe('Number of upvotes for the solution article.'),
        thumbs_down: z.number().describe('Number of down votes for the solution article.'),
        hits: z.number().describe('Number of views for the solution article.'),
        tags: z.array(z.string()).describe('Tags associated with the solution article.'),
        seo_data: z
            .object({
                meta_title: z.string().optional().describe('Meta title for SEO.'),
                meta_description: z.string().optional().describe('Meta description for SEO.'),
                meta_keywords: z.string().optional().describe('Comma-separated meta keywords for SEO.')
            })
            .optional()
            .describe('Meta data for search engine optimization.'),
        agent_id: z.number().describe('ID of the agent who created the solution article.'),
        title: z.string().describe('Title of the solution article.'),
        description: z.string().describe('Description of the solution article in HTML.'),
        description_text: z.string().describe('Description of the solution article in plain text.'),
        status: z.number().describe('Status of the solution article. 1 is draft, 2 is published.'),
        created_at: z.string().describe('Solution article creation timestamp in UTC format.'),
        updated_at: z.string().describe('Solution article updated timestamp in UTC format.')
    })
    .describe('A single solution article retrieved from Freshdesk.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single solution article from Freshdesk without modifying provider data.
 * @pitfalls: thumbs_up, thumbs_down, and hits are consolidated across all article translations unless a language code is supplied.
 */
const action = createAction({
    description: 'Retrieve a single solution article from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_a_solution_article
            endpoint: `/api/v2/solutions/articles/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Solution article not found.',
                id: input.id
            });
        }

        const article = OutputSchema.parse(response.data);
        return article;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
