import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the article to update. Example: "6871119"'),
    title: z.string().optional().describe('The title of the article.'),
    description: z.string().nullable().optional().describe('The description of the article.'),
    body: z.string().nullable().optional().describe('The body of the article in HTML.'),
    state: z
        .union([z.literal('published'), z.literal('draft')])
        .optional()
        .describe('Whether the article is published or draft.'),
    author_id: z.number().optional().describe("The id of the author of the article. Must be a teammate on the help center's workspace."),
    parent_id: z.number().nullable().optional().describe("The id of the article's parent collection or section."),
    parent_type: z
        .union([z.literal('collection'), z.literal('section')])
        .nullable()
        .optional()
        .describe('The type of parent, which can either be a collection or section.')
});

const ProviderArticleSchema = z.object({
    type: z.string(),
    id: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    author_id: z.number(),
    state: z.union([z.literal('published'), z.literal('draft')]),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string().nullable().optional(),
    parent_id: z.number().nullable().optional(),
    parent_type: z
        .union([z.literal('collection'), z.literal('section')])
        .nullable()
        .optional(),
    parent_ids: z.array(z.number()).optional(),
    default_locale: z.string().optional(),
    statistics: z.record(z.string(), z.unknown()).nullable().optional(),
    tags: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    body: z.string().optional(),
    author_id: z.number(),
    state: z.union([z.literal('published'), z.literal('draft')]),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string().optional(),
    parent_id: z.number().optional(),
    parent_type: z.union([z.literal('collection'), z.literal('section')]).optional(),
    parent_ids: z.array(z.number()).optional(),
    default_locale: z.string().optional()
});

const action = createAction({
    description: 'Update a Help Center article',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input['title'] !== undefined) {
            updateData['title'] = input['title'];
        }
        if (input['description'] !== undefined) {
            updateData['description'] = input['description'];
        }
        if (input['body'] !== undefined) {
            updateData['body'] = input['body'];
        }
        if (input['state'] !== undefined) {
            updateData['state'] = input['state'];
        }
        if (input['author_id'] !== undefined) {
            updateData['author_id'] = input['author_id'];
        }
        if (input['parent_id'] !== undefined) {
            updateData['parent_id'] = input['parent_id'];
        }
        if (input['parent_type'] !== undefined) {
            updateData['parent_type'] = input['parent_type'];
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/updatearticle
        const response = await nango.put({
            endpoint: `/articles/${encodeURIComponent(input.id)}`,
            data: updateData,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
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
            ...(providerArticle.parent_type != null && { parent_type: providerArticle.parent_type }),
            ...(providerArticle.parent_ids != null && { parent_ids: providerArticle.parent_ids }),
            ...(providerArticle.default_locale != null && { default_locale: providerArticle.default_locale })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
