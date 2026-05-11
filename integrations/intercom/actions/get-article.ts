import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the article. Example: "123456"')
});

const ProviderArticleSchema = z.object({
    id: z.string(),
    type: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    author_id: z.number().nullable().optional(),
    state: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    body: z.string().optional(),
    author_id: z.number().optional(),
    state: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Help Center article by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-article',
        group: 'Articles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Articles/getArticle
        const response = await nango.get({
            endpoint: `/articles/${encodeURIComponent(input.id)}`,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Article not found',
                article_id: input.id
            });
        }

        const providerArticle = ProviderArticleSchema.parse(response.data);

        return {
            id: providerArticle.id,
            type: providerArticle.type,
            workspace_id: providerArticle.workspace_id,
            title: providerArticle.title,
            state: providerArticle.state,
            created_at: providerArticle.created_at,
            updated_at: providerArticle.updated_at,
            ...(providerArticle.url != null && { url: providerArticle.url }),
            ...(providerArticle.description != null && {
                description: providerArticle.description
            }),
            ...(providerArticle.body != null && { body: providerArticle.body }),
            ...(providerArticle.author_id != null && {
                author_id: providerArticle.author_id
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
