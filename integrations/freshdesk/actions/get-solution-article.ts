import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution article. Example: 2')
    })
    .describe('Input to retrieve a single solution article from Freshdesk.');

const ProviderArticleSchema = z.object({
    id: z.number(),
    type: z.number().nullish(),
    category_id: z.number().nullish(),
    folder_id: z.number().nullish(),
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
        .nullish(),
    thumbs_up: z.number().nullish(),
    thumbs_down: z.number().nullish(),
    hits: z.number().nullish(),
    tags: z.array(z.string()).nullish(),
    seo_data: z
        .object({
            meta_title: z.string().optional(),
            meta_description: z.string().optional(),
            meta_keywords: z.string().optional()
        })
        .nullish(),
    agent_id: z.number().nullish(),
    title: z.string().nullish(),
    description: z.string().nullish(),
    description_text: z.string().nullish(),
    status: z.number().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution article.'),
        type: z.number().optional().describe('Type of the solution article.'),
        category_id: z.number().optional().describe('ID of the category to which the solution article belongs.'),
        folder_id: z.number().optional().describe('ID of the folder to which the solution article belongs.'),
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
            .optional()
            .describe('Parent category and folders in which the article is placed.'),
        thumbs_up: z.number().optional().describe('Number of upvotes for the solution article.'),
        thumbs_down: z.number().optional().describe('Number of down votes for the solution article.'),
        hits: z.number().optional().describe('Number of views for the solution article.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the solution article.'),
        seo_data: z
            .object({
                meta_title: z.string().optional().describe('Meta title for SEO.'),
                meta_description: z.string().optional().describe('Meta description for SEO.'),
                meta_keywords: z.string().optional().describe('Comma-separated meta keywords for SEO.')
            })
            .optional()
            .describe('Meta data for search engine optimization.'),
        agent_id: z.number().optional().describe('ID of the agent who created the solution article.'),
        title: z.string().optional().describe('Title of the solution article.'),
        description: z.string().optional().describe('Description of the solution article in HTML.'),
        description_text: z.string().optional().describe('Description of the solution article in plain text.'),
        status: z.number().optional().describe('Status of the solution article. 1 is draft, 2 is published.'),
        created_at: z.string().optional().describe('Solution article creation timestamp in UTC format.'),
        updated_at: z.string().optional().describe('Solution article updated timestamp in UTC format.')
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

        const article = ProviderArticleSchema.parse(response.data);

        return {
            id: article.id,
            ...(article.type != null && { type: article.type }),
            ...(article.category_id != null && { category_id: article.category_id }),
            ...(article.folder_id != null && { folder_id: article.folder_id }),
            ...(article.hierarchy != null && { hierarchy: article.hierarchy }),
            ...(article.thumbs_up != null && { thumbs_up: article.thumbs_up }),
            ...(article.thumbs_down != null && { thumbs_down: article.thumbs_down }),
            ...(article.hits != null && { hits: article.hits }),
            ...(article.tags != null && { tags: article.tags }),
            ...(article.seo_data != null && { seo_data: article.seo_data }),
            ...(article.agent_id != null && { agent_id: article.agent_id }),
            ...(article.title != null && { title: article.title }),
            ...(article.description != null && { description: article.description }),
            ...(article.description_text != null && { description_text: article.description_text }),
            ...(article.status != null && { status: article.status }),
            ...(article.created_at != null && { created_at: article.created_at }),
            ...(article.updated_at != null && { updated_at: article.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
