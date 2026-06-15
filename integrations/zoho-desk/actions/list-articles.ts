import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of articles to fetch per page. Maximum is 50.')
});

const AuthorSchema = z.object({
    id: z.string().optional(),
    name: z.string().nullish(),
    photoURL: z.string().nullish(),
    status: z.string().nullish(),
    zuid: z.string().nullish()
});

const CategorySchema = z.object({
    id: z.string().optional(),
    name: z.string().nullish(),
    locale: z.string().nullish()
});

const ProviderArticleSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    summary: z.string().nullish(),
    status: z.string().nullish(),
    permission: z.string().nullish(),
    createdTime: z.string().nullish(),
    modifiedTime: z.string().nullish(),
    categoryId: z.string().nullish(),
    authorId: z.string().nullish(),
    webUrl: z.string().nullish(),
    portalUrl: z.string().nullish(),
    locale: z.string().nullish(),
    viewCount: z.string().nullish(),
    likeCount: z.string().nullish(),
    dislikeCount: z.string().nullish(),
    commentCount: z.string().nullish(),
    feedbackCount: z.string().nullish(),
    attachmentCount: z.string().nullish(),
    departmentId: z.string().nullish(),
    isTemplate: z.boolean().nullish(),
    isTrashed: z.boolean().nullish(),
    latestVersionStatus: z.string().nullish(),
    position: z.string().nullish(),
    rootCategoryId: z.string().nullish(),
    usageCount: z.string().nullish(),
    author: AuthorSchema.nullish(),
    category: CategorySchema.nullish()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderArticleSchema)
});

const ArticleSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    summary: z.string().optional(),
    status: z.string().optional(),
    permission: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    categoryId: z.string().optional(),
    authorId: z.string().optional(),
    webUrl: z.string().optional(),
    portalUrl: z.string().optional(),
    locale: z.string().optional(),
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    dislikeCount: z.string().optional(),
    commentCount: z.string().optional(),
    feedbackCount: z.string().optional(),
    attachmentCount: z.string().optional(),
    departmentId: z.string().optional(),
    isTemplate: z.boolean().optional(),
    isTrashed: z.boolean().optional(),
    latestVersionStatus: z.string().optional(),
    position: z.string().optional(),
    rootCategoryId: z.string().optional(),
    usageCount: z.string().optional(),
    author: AuthorSchema.optional(),
    category: CategorySchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ArticleSchema),
    next_cursor: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    connection_config: z
        .object({
            extension: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List knowledge base articles.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-articles',
        group: 'Articles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.articles.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit && Number.isInteger(input.limit) && input.limit > 0 && input.limit <= 50 ? input.limit : 50;
        const from = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(from) || from < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string'
            });
        }

        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.parse(connection);
        const extension = connectionConfig.connection_config?.extension || 'com';
        const baseUrl = `https://desk.zoho.${extension}`;

        const response = await nango.get({
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: '/api/v1/articles',
            params: {
                from: String(from),
                limit: String(limit)
            },
            retries: 3,
            baseUrlOverride: baseUrl
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((article) => {
            return {
                id: article.id,
                ...(article.title != null && { title: article.title }),
                ...(article.summary != null && { summary: article.summary }),
                ...(article.status != null && { status: article.status }),
                ...(article.permission != null && { permission: article.permission }),
                ...(article.createdTime != null && { createdTime: article.createdTime }),
                ...(article.modifiedTime != null && { modifiedTime: article.modifiedTime }),
                ...(article.categoryId != null && { categoryId: article.categoryId }),
                ...(article.authorId != null && { authorId: article.authorId }),
                ...(article.webUrl != null && { webUrl: article.webUrl }),
                ...(article.portalUrl != null && { portalUrl: article.portalUrl }),
                ...(article.locale != null && { locale: article.locale }),
                ...(article.viewCount != null && { viewCount: article.viewCount }),
                ...(article.likeCount != null && { likeCount: article.likeCount }),
                ...(article.dislikeCount != null && { dislikeCount: article.dislikeCount }),
                ...(article.commentCount != null && { commentCount: article.commentCount }),
                ...(article.feedbackCount != null && { feedbackCount: article.feedbackCount }),
                ...(article.attachmentCount != null && { attachmentCount: article.attachmentCount }),
                ...(article.departmentId != null && { departmentId: article.departmentId }),
                ...(article.isTemplate != null && { isTemplate: article.isTemplate }),
                ...(article.isTrashed != null && { isTrashed: article.isTrashed }),
                ...(article.latestVersionStatus != null && { latestVersionStatus: article.latestVersionStatus }),
                ...(article.position != null && { position: article.position }),
                ...(article.rootCategoryId != null && { rootCategoryId: article.rootCategoryId }),
                ...(article.usageCount != null && { usageCount: article.usageCount }),
                ...(article.author != null && { author: article.author }),
                ...(article.category != null && { category: article.category })
            };
        });

        const nextCursor = items.length === limit ? String(from + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
