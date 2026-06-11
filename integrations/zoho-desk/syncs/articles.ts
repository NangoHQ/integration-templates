import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ArticleSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    summary: z.string().optional(),
    status: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    categoryId: z.string().optional(),
    authorId: z.string().optional(),
    webUrl: z.string().optional(),
    permalink: z.string().optional(),
    viewCount: z.number().optional(),
    likeCount: z.number().optional(),
    dislikeCount: z.number().optional(),
    feedbackCount: z.number().optional(),
    commentCount: z.number().optional(),
    attachmentCount: z.number().optional(),
    departmentId: z.string().optional(),
    locale: z.string().optional()
});

const ProviderArticleSchema = z.object({
    id: z.union([z.string(), z.number()]).optional().nullable(),
    title: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    createdTime: z.string().optional().nullable(),
    modifiedTime: z.string().optional().nullable(),
    categoryId: z.union([z.string(), z.number()]).optional().nullable(),
    authorId: z.union([z.string(), z.number()]).optional().nullable(),
    webUrl: z.string().optional().nullable(),
    permalink: z.string().optional().nullable(),
    viewCount: z.union([z.string(), z.number()]).optional().nullable(),
    likeCount: z.union([z.string(), z.number()]).optional().nullable(),
    dislikeCount: z.union([z.string(), z.number()]).optional().nullable(),
    feedbackCount: z.union([z.string(), z.number()]).optional().nullable(),
    commentCount: z.union([z.string(), z.number()]).optional().nullable(),
    attachmentCount: z.union([z.string(), z.number()]).optional().nullable(),
    departmentId: z.union([z.string(), z.number()]).optional().nullable(),
    locale: z.string().optional().nullable()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    from: z.number().int()
});

const sync = createSync({
    description: 'Sync articles.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Article: ArticleSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/articles'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parseResult = CheckpointSchema.safeParse(rawCheckpoint);
        const parsedCheckpoint = parseResult.success ? parseResult.data : CheckpointSchema.parse({ updated_after: '', from: 1 });
        const updatedAfter = parsedCheckpoint.updated_after || undefined;
        const startFrom = parsedCheckpoint.from;
        let nextFrom: number | undefined;

        const nowIso = new Date().toISOString();

        const proxyConfig: ProxyConfiguration = {
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: '/v1/articles',
            params: {
                sortBy: 'modifiedTime',
                ...(updatedAfter && {
                    modifiedTimeRange: `${updatedAfter},${nowIso}`
                })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: startFrom,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextFrom = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const articles = [];

            for (const raw of page) {
                const validated = ProviderArticleSchema.parse(raw);
                const id = validated.id === undefined || validated.id === null ? undefined : String(validated.id);
                if (!id) {
                    throw new Error('Article missing id');
                }

                const article = {
                    id,
                    ...(validated.title !== undefined && validated.title !== null && { title: validated.title }),
                    ...(validated.summary !== undefined && validated.summary !== null && { summary: validated.summary }),
                    ...(validated.status !== undefined && validated.status !== null && { status: validated.status }),
                    ...(validated.createdTime !== undefined && validated.createdTime !== null && { createdTime: validated.createdTime }),
                    ...(validated.modifiedTime !== undefined && validated.modifiedTime !== null && { modifiedTime: validated.modifiedTime }),
                    ...(validated.categoryId !== undefined && validated.categoryId !== null && { categoryId: String(validated.categoryId) }),
                    ...(validated.authorId !== undefined && validated.authorId !== null && { authorId: String(validated.authorId) }),
                    ...(validated.webUrl !== undefined && validated.webUrl !== null && { webUrl: validated.webUrl }),
                    ...(validated.permalink !== undefined && validated.permalink !== null && { permalink: validated.permalink }),
                    ...(validated.viewCount !== undefined && validated.viewCount !== null && { viewCount: Number(validated.viewCount) }),
                    ...(validated.likeCount !== undefined && validated.likeCount !== null && { likeCount: Number(validated.likeCount) }),
                    ...(validated.dislikeCount !== undefined && validated.dislikeCount !== null && { dislikeCount: Number(validated.dislikeCount) }),
                    ...(validated.feedbackCount !== undefined && validated.feedbackCount !== null && { feedbackCount: Number(validated.feedbackCount) }),
                    ...(validated.commentCount !== undefined && validated.commentCount !== null && { commentCount: Number(validated.commentCount) }),
                    ...(validated.attachmentCount !== undefined &&
                        validated.attachmentCount !== null && { attachmentCount: Number(validated.attachmentCount) }),
                    ...(validated.departmentId !== undefined && validated.departmentId !== null && { departmentId: String(validated.departmentId) }),
                    ...(validated.locale !== undefined && validated.locale !== null && { locale: validated.locale })
                };

                articles.push(article);
            }

            if (articles.length === 0) {
                if (nextFrom !== undefined) {
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter || '',
                        from: nextFrom
                    });
                }
                continue;
            }

            await nango.batchSave(articles, 'Article');

            if (nextFrom !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    from: nextFrom
                });
            }
        }

        await nango.saveCheckpoint({
            updated_after: nowIso,
            from: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
