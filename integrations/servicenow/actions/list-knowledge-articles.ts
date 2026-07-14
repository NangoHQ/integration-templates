import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of articles to return per page. Defaults to 100.')
});

const ReferenceFieldSchema = z.union([
    z.string(),
    z.object({ display_value: z.string(), link: z.string() }),
    z.object({ value: z.string(), link: z.string() })
]);

const ProviderArticleSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().nullable().optional(),
    workflow_state: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional(),
    sys_created_by: z.string().optional(),
    sys_updated_by: z.string().optional(),
    kb_category: ReferenceFieldSchema.nullable().optional(),
    kb_knowledge_base: ReferenceFieldSchema.nullable().optional(),
    author: ReferenceFieldSchema.nullable().optional(),
    published: z.string().optional(),
    text: z.string().nullable().optional(),
    article_type: z.string().optional()
});

const OutputArticleSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    workflow_state: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional(),
    sys_created_by: z.string().optional(),
    sys_updated_by: z.string().optional(),
    kb_category: z.string().optional(),
    kb_knowledge_base: z.string().optional(),
    author: z.string().optional(),
    published: z.string().optional(),
    text: z.string().optional(),
    article_type: z.string().optional()
});

const OutputSchema = z.object({
    articles: z.array(OutputArticleSchema),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omit if there are no more pages.')
});

function parseLinkHeader(linkHeader: string | undefined): { next: string | undefined } {
    const result: { next: string | undefined } = { next: undefined };
    if (!linkHeader) {
        return result;
    }

    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match) {
            const url = match[1];
            const rel = match[2];
            if (rel === 'next') {
                result.next = url;
            }
        }
    }

    return result;
}

function extractOffsetFromUrl(url: string): string | undefined {
    const match = url.match(/[?&]sysparm_offset=([^&]+)/);
    return match ? match[1] : undefined;
}

function extractStringValue(field: unknown): string | undefined {
    if (typeof field === 'string') {
        return field;
    }
    if (field !== null && typeof field === 'object') {
        const displayValue = Reflect.get(field, 'display_value');
        if (typeof displayValue === 'string') {
            return displayValue;
        }
        const value = Reflect.get(field, 'value');
        if (typeof value === 'string') {
            return value;
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List knowledge base articles.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const offset = input.cursor ?? '0';

        // https://developer.servicenow.com/dev.do#!/reference/api/now-rest/knowledge-management/kb_knowledge
        const response = await nango.get({
            endpoint: '/api/now/table/kb_knowledge',
            params: {
                sysparm_query: 'workflow_state=published',
                sysparm_limit: String(limit),
                sysparm_offset: offset,
                sysparm_display_value: 'true'
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.result)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ServiceNow Table API.'
            });
        }

        const articles = [];
        for (const item of rawData.result) {
            const parsed = ProviderArticleSchema.safeParse(item);
            if (parsed.success) {
                articles.push({
                    sys_id: parsed.data.sys_id,
                    ...(parsed.data.number !== undefined && { number: parsed.data.number }),
                    ...(parsed.data.short_description !== undefined && { short_description: parsed.data.short_description }),
                    ...(parsed.data.description !== undefined && parsed.data.description !== null && { description: parsed.data.description }),
                    ...(parsed.data.workflow_state !== undefined && { workflow_state: parsed.data.workflow_state }),
                    ...(parsed.data.sys_created_on !== undefined && { sys_created_on: parsed.data.sys_created_on }),
                    ...(parsed.data.sys_updated_on !== undefined && { sys_updated_on: parsed.data.sys_updated_on }),
                    ...(parsed.data.sys_created_by !== undefined && { sys_created_by: parsed.data.sys_created_by }),
                    ...(parsed.data.sys_updated_by !== undefined && { sys_updated_by: parsed.data.sys_updated_by }),
                    ...(extractStringValue(parsed.data.kb_category) !== undefined && { kb_category: extractStringValue(parsed.data.kb_category) }),
                    ...(extractStringValue(parsed.data.kb_knowledge_base) !== undefined && {
                        kb_knowledge_base: extractStringValue(parsed.data.kb_knowledge_base)
                    }),
                    ...(extractStringValue(parsed.data.author) !== undefined && { author: extractStringValue(parsed.data.author) }),
                    ...(parsed.data.published !== undefined && { published: parsed.data.published }),
                    ...(parsed.data.text !== undefined && parsed.data.text !== null && { text: parsed.data.text }),
                    ...(parsed.data.article_type !== undefined && { article_type: parsed.data.article_type })
                });
            }
        }

        const linkHeader = parseLinkHeader(response.headers?.['link']);
        const nextCursor = linkHeader.next ? extractOffsetFromUrl(linkHeader.next) : undefined;

        return {
            articles,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
