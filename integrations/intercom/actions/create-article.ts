import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('The title of the article. Example: "Thanks for everything"'),
    body: z.string().describe('The content of the article in HTML. Example: "<p>This is the body in html</p>"'),
    author_id: z.number().describe("The id of the author of the article. Must be a teammate on the help center's workspace. Example: 1295"),
    state: z.enum(['draft', 'published']).optional().describe('Whether the article will be published or will be a draft. Defaults to draft.'),
    description: z.string().optional().describe('The description of the article. Example: "Description of the Article"'),
    parent_id: z.number().optional().describe("The id of the article's parent collection or section. An article without this field stands alone. Example: 18"),
    parent_type: z.enum(['collection', 'section']).optional().describe('The type of parent, which can either be a collection or section. Example: "collection"')
});

const ProviderArticleSchema = z.object({
    type: z.string(),
    id: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    body: z.string().nullable(),
    author_id: z.number(),
    state: z.enum(['draft', 'published']),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string().nullable().optional(),
    parent_id: z.number().nullable().optional(),
    parent_type: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier for the article which is given by Intercom.'),
    workspace_id: z.string().describe('The id of the workspace which the article belongs to.'),
    title: z.string().describe('The title of the article.'),
    description: z.string().optional().describe('The description of the article.'),
    body: z.string().optional().describe('The body of the article in HTML.'),
    author_id: z.number().describe('The id of the author of the article.'),
    state: z.enum(['draft', 'published']).describe('Whether the article is published or is a draft.'),
    created_at: z.number().describe('The time when the article was created (Unix timestamp in seconds).'),
    updated_at: z.number().describe('The time when the article was last updated (Unix timestamp in seconds).'),
    url: z.string().optional().describe('The URL of the article.'),
    parent_id: z.number().optional().describe("The id of the article's parent collection or section."),
    parent_type: z.string().optional().describe('The type of parent, which can either be a collection or section.')
});

const action = createAction({
    description: 'Create a Help Center article.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_articles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/createarticle
        const response = await nango.post({
            endpoint: '/articles',
            headers: {
                'Intercom-Version': '2.11'
            },
            data: {
                title: input.title,
                body: input.body,
                author_id: input.author_id,
                ...(input.state !== undefined && { state: input.state }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.parent_id !== undefined && { parent_id: input.parent_id }),
                ...(input.parent_type !== undefined && { parent_type: input.parent_type })
            },
            retries: 3
        });

        const providerArticle = ProviderArticleSchema.parse(response.data);

        return {
            id: providerArticle.id,
            workspace_id: providerArticle.workspace_id,
            title: providerArticle.title,
            ...(providerArticle.description != null && { description: providerArticle.description }),
            ...(providerArticle.body != null && { body: providerArticle.body }),
            author_id: providerArticle.author_id,
            state: providerArticle.state,
            created_at: providerArticle.created_at,
            updated_at: providerArticle.updated_at,
            ...(providerArticle.url != null && { url: providerArticle.url }),
            ...(providerArticle.parent_id != null && { parent_id: providerArticle.parent_id }),
            ...(providerArticle.parent_type != null && { parent_type: providerArticle.parent_type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
