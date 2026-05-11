import { createSync } from 'nango';
import { z } from 'zod';

const _ArticleSchema = z.object({
    id: z.number().int(),
    author_id: z.number().int().optional(),
    body: z.string().optional(),
    comments_disabled: z.boolean().optional(),
    content_tag_ids: z.array(z.number()).optional(),
    created_at: z.string(),
    draft: z.boolean().optional(),
    edited_at: z.string().optional(),
    html_url: z.string().optional(),
    label_names: z.array(z.string()).optional(),
    locale: z.string(),
    outdated: z.boolean().optional(),
    outdated_locales: z.array(z.string()).optional(),
    permission_group_id: z.number().int().optional(),
    position: z.number().int().optional(),
    promoted: z.boolean().optional(),
    section_id: z.number().int().optional(),
    source_locale: z.string().optional(),
    title: z.string(),
    updated_at: z.string(),
    url: z.string(),
    user_segment_id: z.number().int().optional().nullable(),
    user_segment_ids: z.array(z.number()).optional(),
    vote_count: z.number().int().optional(),
    vote_sum: z.number().int().optional()
});

const ArticleOutputSchema = z.object({
    id: z.string(),
    author_id: z.number().int().optional(),
    body: z.string().optional(),
    comments_disabled: z.boolean().optional(),
    content_tag_ids: z.array(z.number()).optional(),
    created_at: z.string(),
    draft: z.boolean().optional(),
    edited_at: z.string().optional(),
    html_url: z.string().optional(),
    label_names: z.array(z.string()).optional(),
    locale: z.string(),
    outdated: z.boolean().optional(),
    outdated_locales: z.array(z.string()).optional(),
    permission_group_id: z.number().int().optional(),
    position: z.number().int().optional(),
    promoted: z.boolean().optional(),
    section_id: z.number().int().optional(),
    source_locale: z.string().optional(),
    title: z.string(),
    updated_at: z.string(),
    url: z.string(),
    user_segment_id: z.number().int().optional().nullable(),
    user_segment_ids: z.array(z.number()).optional(),
    vote_count: z.number().int().optional(),
    vote_sum: z.number().int().optional()
});

const CheckpointSchema = z.object({
    start_time: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const IncrementalArticlesResponseSchema = z.object({
    articles: z.array(_ArticleSchema),
    count: z.number().optional(),
    end_time: z.number(),
    next_page: z.string().nullable().optional()
});

function isValidCheckpoint(checkpoint: unknown): checkpoint is Checkpoint {
    const result = CheckpointSchema.safeParse(checkpoint);
    return result.success;
}

function getCheckpointStartTime(checkpoint: Checkpoint | null): number {
    if (!checkpoint) {
        return 0;
    }

    if (typeof checkpoint.start_time === 'number') {
        return checkpoint.start_time;
    }

    const parsedEpoch = Number(checkpoint.start_time);
    if (Number.isFinite(parsedEpoch)) {
        return Math.trunc(parsedEpoch);
    }

    const parsedDate = Date.parse(checkpoint.start_time);
    if (Number.isFinite(parsedDate)) {
        return Math.floor(parsedDate / 1000);
    }

    return 0;
}

function toRelativeEndpoint(url: string): string {
    const parsedUrl = new URL(url);
    return `${parsedUrl.pathname}${parsedUrl.search}`;
}

const sync = createSync({
    description: 'Sync Zendesk Help Center articles',
    version: '3.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/articles' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Article: ArticleOutputSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = isValidCheckpoint(rawCheckpoint) ? rawCheckpoint : null;
        const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
        const initialStartTime = Math.min(getCheckpointStartTime(checkpoint), oneMinuteAgo);
        let currentEndpoint: string | null = null;

        while (true) {
            // https://developer.zendesk.com/api-reference/help_center/help-center-api/articles/#list-articles-incrementally
            const response = await nango.get({
                endpoint: currentEndpoint ?? '/api/v2/help_center/incremental/articles.json',
                ...(currentEndpoint
                    ? {}
                    : {
                          params: {
                              start_time: initialStartTime
                          }
                      }),
                retries: 3
            });

            const parsed = IncrementalArticlesResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                throw new Error(`Failed to parse incremental articles response: ${parsed.error.message}`);
            }

            const { articles, end_time, next_page } = parsed.data;

            const mappedArticles = articles.map((article) => ({
                id: String(article.id),
                ...(article.author_id !== undefined && { author_id: article.author_id }),
                ...(article.body !== undefined && { body: article.body }),
                ...(article.comments_disabled !== undefined && { comments_disabled: article.comments_disabled }),
                ...(article.content_tag_ids !== undefined && { content_tag_ids: article.content_tag_ids }),
                created_at: article.created_at,
                ...(article.draft !== undefined && { draft: article.draft }),
                ...(article.edited_at !== undefined && { edited_at: article.edited_at }),
                ...(article.html_url !== undefined && { html_url: article.html_url }),
                ...(article.label_names !== undefined && { label_names: article.label_names }),
                locale: article.locale,
                ...(article.outdated !== undefined && { outdated: article.outdated }),
                ...(article.outdated_locales !== undefined && { outdated_locales: article.outdated_locales }),
                ...(article.permission_group_id !== undefined && { permission_group_id: article.permission_group_id }),
                ...(article.position !== undefined && { position: article.position }),
                ...(article.promoted !== undefined && { promoted: article.promoted }),
                ...(article.section_id !== undefined && { section_id: article.section_id }),
                ...(article.source_locale !== undefined && { source_locale: article.source_locale }),
                title: article.title,
                updated_at: article.updated_at,
                url: article.url,
                ...(article.user_segment_id !== undefined && { user_segment_id: article.user_segment_id }),
                ...(article.user_segment_ids !== undefined && { user_segment_ids: article.user_segment_ids }),
                ...(article.vote_count !== undefined && { vote_count: article.vote_count }),
                ...(article.vote_sum !== undefined && { vote_sum: article.vote_sum })
            }));

            if (mappedArticles.length > 0) {
                await nango.batchSave(mappedArticles, 'Article');
            }

            await nango.saveCheckpoint({ start_time: String(end_time) });

            const nextEndpoint = next_page ? toRelativeEndpoint(next_page) : null;
            if (!nextEndpoint || nextEndpoint === currentEndpoint) {
                break;
            }

            currentEndpoint = nextEndpoint;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
