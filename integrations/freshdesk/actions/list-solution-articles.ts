import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        folder_id: z.number().describe('ID of the folder whose articles should be listed.'),
        per_page: z.number().optional().describe('Number of articles per page. Maximum is 100. Defaults to 30.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input parameters for listing Freshdesk solution articles.');

const ProviderHierarchyDataSchema = z.object({
    id: z.number(),
    name: z.string(),
    language: z.string()
});

const ProviderHierarchySchema = z.object({
    level: z.number(),
    type: z.string(),
    data: ProviderHierarchyDataSchema
});

const ProviderArticleSchema = z.object({
    id: z.number(),
    type: z.number().nullable().optional(),
    agent_id: z.number().nullable().optional(),
    category_id: z.number().nullable().optional(),
    folder_id: z.number().nullable().optional(),
    hierarchy: z.array(ProviderHierarchySchema).nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    description_text: z.string().nullable().optional(),
    status: z.number().nullable().optional(),
    seo_data: z.record(z.string(), z.unknown()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    thumbs_up: z.number().nullable().optional(),
    thumbs_down: z.number().nullable().optional(),
    hits: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const HierarchyDataSchema = z.object({
    id: z.number().describe('ID of the hierarchy node.'),
    name: z.string().describe('Name of the hierarchy node.'),
    language: z.string().describe('Language code of the hierarchy node.')
});

const HierarchySchema = z.object({
    level: z.number().describe('Hierarchy level depth.'),
    type: z.string().describe('Node type, such as category or folder.'),
    data: HierarchyDataSchema.describe('Details of the hierarchy node.')
});

const ArticleSchema = z.object({
    id: z.number().describe('Unique ID of the solution article.'),
    type: z.number().optional().describe('Article type code.'),
    agent_id: z.number().optional().describe('ID of the agent who created the article.'),
    category_id: z.number().optional().describe('ID of the parent category.'),
    folder_id: z.number().optional().describe('ID of the folder the article belongs to.'),
    hierarchy: z.array(HierarchySchema).optional().describe('Parent category and folder hierarchy for the article.'),
    title: z.string().optional().describe('Title of the solution article.'),
    description: z.string().optional().describe('Content of the article in HTML format.'),
    description_text: z.string().optional().describe('Plain-text version of the article content.'),
    status: z.number().optional().describe('Publication status. 1 is draft, 2 is published.'),
    seo_data: z.record(z.string(), z.unknown()).optional().describe('SEO metadata object.'),
    tags: z.array(z.string()).optional().describe('Tags associated with the article.'),
    thumbs_up: z.number().optional().describe('Number of upvotes.'),
    thumbs_down: z.number().optional().describe('Number of downvotes.'),
    hits: z.number().optional().describe('Number of views.'),
    created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
    updated_at: z.string().optional().describe('Last updated timestamp in ISO 8601 format.')
});

const OutputSchema = z
    .object({
        items: z.array(ArticleSchema).describe('List of solution articles.'),
        next_page: z.string().optional().describe('Pagination cursor (page number) for the next page. Omitted when there are no more pages.')
    })
    .describe('Output of listing Freshdesk solution articles.');

function getNextPageFromLinkHeader(linkValue: string | undefined): number | undefined {
    if (typeof linkValue !== 'string') {
        return undefined;
    }
    const match = linkValue.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="next"/);
    if (!match || match[1] === undefined) {
        return undefined;
    }
    const parsed = parseInt(match[1], 10);
    return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeArticle(article: z.infer<typeof ProviderArticleSchema>): z.infer<typeof ArticleSchema> {
    return {
        id: article.id,
        ...(article.type != null && { type: article.type }),
        ...(article.agent_id != null && { agent_id: article.agent_id }),
        ...(article.category_id != null && { category_id: article.category_id }),
        ...(article.folder_id != null && { folder_id: article.folder_id }),
        ...(article.hierarchy != null && {
            hierarchy: article.hierarchy.map((h) => ({
                level: h.level,
                type: h.type,
                data: {
                    id: h.data.id,
                    name: h.data.name,
                    language: h.data.language
                }
            }))
        }),
        ...(article.title != null && { title: article.title }),
        ...(article.description != null && { description: article.description }),
        ...(article.description_text != null && { description_text: article.description_text }),
        ...(article.status != null && { status: article.status }),
        ...(article.seo_data != null && { seo_data: article.seo_data }),
        ...(article.tags != null && { tags: article.tags }),
        ...(article.thumbs_up != null && { thumbs_up: article.thumbs_up }),
        ...(article.thumbs_down != null && { thumbs_down: article.thumbs_down }),
        ...(article.hits != null && { hits: article.hits }),
        ...(article.created_at != null && { created_at: article.created_at }),
        ...(article.updated_at != null && { updated_at: article.updated_at })
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads solution articles from the Freshdesk knowledge base.
 * @pitfalls: Freshdesk rate limits are plan-based and can be as low as 50 requests per minute; even read calls and failed requests count toward the quota.
 */
const action = createAction({
    description: 'List solution articles from Freshdesk.',
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid page number string.'
            });
        }
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const params: Record<string, string | number> = {
            page: page,
            ...(input.per_page !== undefined && { per_page: input.per_page })
        };

        // https://developers.freshdesk.com/api/#solution_article_attributes
        const response = await nango.get({
            endpoint: `/api/v2/solutions/folders/${encodeURIComponent(String(input.folder_id))}/articles`,
            params: params,
            retries: 3
        });

        const articles = z.array(ProviderArticleSchema).parse(response.data);
        const items = articles.map(normalizeArticle);

        const linkValue = response.headers['link'];
        const nextPage = getNextPageFromLinkHeader(linkValue);

        return {
            items,
            ...(nextPage !== undefined && { next_page: String(nextPage) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
