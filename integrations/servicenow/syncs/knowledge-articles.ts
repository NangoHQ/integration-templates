import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ReferenceFieldSchema = z
    .union([
        z.string(),
        z.object({
            value: z.string(),
            display_value: z.string().optional()
        })
    ])
    .optional()
    .nullable();

const ProviderKnowledgeArticleSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    short_description: z.string().optional(),
    text: z.string().optional().nullable(),
    workflow_state: z.string().optional(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional(),
    author: ReferenceFieldSchema,
    kb_category: ReferenceFieldSchema,
    kb_knowledge_base: ReferenceFieldSchema,
    published: z.string().optional().nullable(),
    rating: z.string().optional().nullable(),
    active: z.union([z.boolean(), z.string()]).optional().nullable()
});

const KnowledgeArticleSchema = z.object({
    id: z.string(),
    number: z.string().optional(),
    short_description: z.string().optional(),
    text: z.string().optional(),
    workflow_state: z.string().optional(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional(),
    author: z.string().optional(),
    kb_category: z.string().optional(),
    kb_knowledge_base: z.string().optional(),
    published: z.string().optional(),
    rating: z.string().optional(),
    active: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync knowledge base articles (kb_knowledge).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        KnowledgeArticle: KnowledgeArticleSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : null;

        // Inclusive boundary: records sharing the checkpoint timestamp with the last-seen article must be
        // re-included, or they can be permanently skipped after a page/run boundary. batchSave upserts by
        // id, so re-saving the boundary record(s) is safe.
        let query = 'workflow_state=published^ORDERBYsys_updated_on';
        if (checkpoint?.updated_after) {
            query = `sys_updated_on>=${checkpoint.updated_after}^${query}`;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/rest/table-api
            endpoint: '/api/now/table/kb_knowledge',
            params: {
                sysparm_query: query,
                sysparm_limit: 100
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                response_path: 'result',
                limit_name_in_request: 'sysparm_limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from paginate');
            }

            const articles = page.map((record: unknown) => {
                const parsed = ProviderKnowledgeArticleSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse knowledge article: ${parsed.error.message}`);
                }

                const article = parsed.data;

                const author = article.author != null ? (typeof article.author === 'string' ? article.author : article.author.value) : undefined;
                const kbCategory =
                    article.kb_category != null ? (typeof article.kb_category === 'string' ? article.kb_category : article.kb_category.value) : undefined;
                const kbKnowledgeBase =
                    article.kb_knowledge_base != null
                        ? typeof article.kb_knowledge_base === 'string'
                            ? article.kb_knowledge_base
                            : article.kb_knowledge_base.value
                        : undefined;

                return {
                    id: article.sys_id,
                    ...(article.number != null && { number: article.number }),
                    ...(article.short_description != null && { short_description: article.short_description }),
                    ...(article.text != null && { text: article.text }),
                    ...(article.workflow_state != null && { workflow_state: article.workflow_state }),
                    sys_updated_on: article.sys_updated_on,
                    ...(article.sys_created_on != null && { sys_created_on: article.sys_created_on }),
                    ...(author != null && { author }),
                    ...(kbCategory != null && { kb_category: kbCategory }),
                    ...(kbKnowledgeBase != null && { kb_knowledge_base: kbKnowledgeBase }),
                    ...(article.published != null && { published: article.published }),
                    ...(article.rating != null && { rating: article.rating }),
                    ...(article.active != null && { active: String(article.active) })
                };
            });

            if (articles.length === 0) {
                continue;
            }

            await nango.batchSave(articles, 'KnowledgeArticle');

            const lastArticle = articles[articles.length - 1];
            if (lastArticle) {
                await nango.saveCheckpoint({
                    updated_after: lastArticle.sys_updated_on
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
