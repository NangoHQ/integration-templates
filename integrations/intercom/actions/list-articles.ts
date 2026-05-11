import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to starting_after parameter. Omit for the first page.'),
    per_page: z.number().int().min(1).max(150).optional().describe('Number of results per page. Maximum is 150.')
});

const ProviderArticleSchema = z.object({
    type: z.string(),
    id: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    author_id: z.union([z.string(), z.number()]),
    state: z.enum(['published', 'draft']),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string().nullable().optional(),
    parent_id: z.union([z.string(), z.number()]).nullable().optional(),
    parent_ids: z.array(z.union([z.string(), z.number()])).optional(),
    parent_type: z.string().nullable().optional(),
    default_locale: z.string().optional(),
    translated_content: z.record(z.string(), z.any()).nullable().optional(),
    tags: z
        .object({
            type: z.string(),
            tags: z.array(z.unknown())
        })
        .optional()
});

const ProviderPagesSchema = z.object({
    type: z.string(),
    page: z.number(),
    per_page: z.number(),
    total_pages: z.number(),
    next: z
        .object({
            page: z.number(),
            starting_after: z.string()
        })
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    type: z.string(),
    pages: ProviderPagesSchema.nullable().optional(),
    total_count: z.number(),
    data: z.array(ProviderArticleSchema)
});

const ArticleSchema = z.object({
    id: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    body: z.string().optional(),
    author_id: z.string(),
    state: z.enum(['published', 'draft']),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string().optional(),
    parent_id: z.string().optional(),
    parent_ids: z.array(z.string()).optional(),
    parent_type: z.string().optional(),
    default_locale: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ArticleSchema),
    next_cursor: z.string().optional(),
    total_count: z.number()
});

const action = createAction({
    description: 'List Help Center articles with pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-articles',
        group: 'Articles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['articles:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            params['starting_after'] = input.cursor;
        }

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/listarticles
        const response = await nango.get({
            endpoint: '/articles',
            params: params,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const articles = providerData.data.map((article) => ({
            id: article.id,
            workspace_id: article.workspace_id,
            title: article.title,
            ...(article.description != null && { description: article.description }),
            ...(article.body != null && { body: article.body }),
            author_id: String(article.author_id),
            state: article.state,
            created_at: article.created_at,
            updated_at: article.updated_at,
            ...(article.url != null && { url: article.url }),
            ...(article.parent_id != null && { parent_id: String(article.parent_id) }),
            ...(article.parent_ids != null && {
                parent_ids: article.parent_ids.map((id) => String(id))
            }),
            ...(article.parent_type != null && { parent_type: article.parent_type }),
            ...(article.default_locale != null && { default_locale: article.default_locale })
        }));

        const next_cursor = providerData.pages?.next?.starting_after;

        return {
            items: articles,
            total_count: providerData.total_count,
            ...(next_cursor != null && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
