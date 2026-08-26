import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ArticleSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    workspace_id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    author_id: z.coerce.number().optional(),
    state: z.enum(['published', 'draft']).optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    url: z.string().nullable().optional(),
    parent_id: z.coerce.number().nullable().optional(),
    parent_ids: z.array(z.coerce.number()).optional(),
    parent_type: z.enum(['collection', 'section']).nullable().optional(),
    default_locale: z.string().optional(),
    content_id: z.string().optional(),
    statistics: z
        .object({
            type: z.string().optional(),
            views: z.number().optional(),
            conversions: z.number().optional(),
            reactions: z.number().optional(),
            happy_reaction_percentage: z.number().optional(),
            neutral_reaction_percentage: z.number().optional(),
            sad_reaction_percentage: z.number().optional()
        })
        .nullable()
        .optional()
});

type Article = z.infer<typeof ArticleSchema>;

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync Help Center articles from Intercom',
    version: '3.0.1',
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
        const checkpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(checkpoint);
        let page: number | undefined = checkpointParsed.success ? (checkpointParsed.data.page ?? 0) : 0;

        // /articles does not expose a provider-side updated_at filter, so this
        // must stay a full refresh to keep delete tracking accurate.
        await nango.trackDeletesStart('Article');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/listarticles
            endpoint: '/articles',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                response_path: 'data',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate<Article>(proxyConfig)) {
            const articles = pageResults.map((article) => ArticleSchema.parse(article));
            if (articles.length > 0) {
                await nango.batchSave(articles, 'Article');
            }

            // Persist pagination progress after every page so a run that exceeds the
            // execution window resumes from the next page instead of restarting.
            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Article');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
