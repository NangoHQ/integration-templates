import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        site: z.string().min(1).describe('Site API identifier where the article is published.'),
        title: z.string().min(1).describe('Article title as ordinary Unicode text, not HTML-escaped.'),
        bodyMarkdown: z.string().min(1).describe('Complete article body as ordinary Unicode Markdown.'),
        tags: z
            .array(
                z
                    .string()
                    .min(1)
                    .regex(/^[^;]+$/)
                    .describe('A single article tag name; semicolons are not allowed.')
            )
            .refine((tags) => new Set(tags).size === tags.length, { message: 'tags must not contain duplicates' })
            .meta({ uniqueItems: true, description: 'Complete set of article tag names; empty explicitly requests no tags, subject to site rules.' }),
        articleType: z.string().min(1).describe('Provider-supported article classification, for example announcement; no exhaustive set is documented.')
    })
    .describe('Fields required to publish a new article on a Stack Exchange site.');

const OutputSchema = z
    .object({
        id: z.string().describe("New article's opaque site-local ID."),
        link: z.string().optional().describe('New article permalink when supplied.'),
        site: z.string().describe('Site API identifier qualifying this article.'),
        tags: z.array(z.string().describe('A persisted tag name returned by the provider.')).describe('Persisted tag names returned by the provider.'),
        title: z.string().describe('Persisted article title as decoded ordinary text.'),
        bodyHtml: z.string().describe('Provider-rendered published article HTML.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant from provider Unix seconds, normalized to UTC Z when supplied.'),
        articleType: z.string().describe('Provider-returned persisted classification.'),
        bodyMarkdown: z.string().optional().describe('Provider-returned persisted Markdown when available.')
    })
    .describe('The newly published article as persisted by the provider.');

const ProviderArticleSchema = z.object({
    article_id: z.number().int(),
    article_type: z.string(),
    title: z.string(),
    body: z.string(),
    tags: z.array(z.string()),
    link: z.string().optional(),
    body_markdown: z.string().optional(),
    creation_date: z.number().int().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderArticleSchema).optional()
});

const ProviderErrorSchema = z.object({
    error_name: z.string().optional(),
    error_message: z.string().optional()
});

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' '
};

function decodeHtmlEntities(text: string): string {
    return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity: string) => {
        let codePoint: number;
        if (entity.startsWith('#x') || entity.startsWith('#X')) {
            codePoint = Number.parseInt(entity.slice(2), 16);
        } else if (entity.startsWith('#')) {
            codePoint = Number.parseInt(entity.slice(1), 10);
        } else {
            return NAMED_ENTITIES[entity] ?? match;
        }
        if (Number.isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
            return match;
        }
        return String.fromCodePoint(codePoint);
    });
}

interface ProviderErrorDetails {
    name: string | undefined;
    message: string | undefined;
    status: number | undefined;
}

function readProviderError(err: unknown): ProviderErrorDetails {
    let data: unknown;
    let status: unknown;
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = err.response;
        if (typeof response === 'object' && response !== null) {
            if ('data' in response) {
                data = response.data;
            }
            if ('status' in response) {
                status = response.status;
            }
        }
    }
    const parsed = ProviderErrorSchema.safeParse(data);
    return {
        name: parsed.success ? parsed.data.error_name : undefined,
        message: parsed.success ? parsed.data.error_message : undefined,
        status: typeof status === 'number' ? status : undefined
    };
}

function publicCodeForProviderError(name: string | undefined, status: number | undefined): string | undefined {
    switch (name) {
        case 'bad_parameter':
        case 'access_denied':
        case 'write_failed':
        case 'duplicate_request':
        case 'internal_error':
        case 'throttle_violation':
        case 'temporarily_unavailable':
            return name;
        default:
            break;
    }
    switch (status) {
        case 400:
            return 'bad_parameter';
        case 403:
            return 'access_denied';
        case 407:
            return 'write_failed';
        case 409:
            return 'duplicate_request';
        case 500:
            return 'internal_error';
        case 502:
            return 'throttle_violation';
        case 503:
            return 'temporarily_unavailable';
        default:
            return undefined;
    }
}

function toPublicError(err: unknown): Error {
    const { name, message, status } = readProviderError(err);
    const detail = message ?? 'the provider did not return an error message';
    const isAccessDenied = name === 'access_denied' || (name === undefined && status === 403);
    if (isAccessDenied && /stack apps post/i.test(message ?? '')) {
        return new Error(`app_write_disabled: ${detail}`);
    }
    const code = publicCodeForProviderError(name, status);
    if (code !== undefined) {
        return new Error(`${code}: ${detail}`);
    }
    return err instanceof Error ? err : new Error(String(err));
}

/**
 * @tags: [write]
 * @tagReason: The only provider call is a POST that publishes a new article on the site, a provider mutation.
 * @pitfalls: Articles go live immediately with no draft state, and separate calls are not deduplicated, so retrying after an uncertain failure can publish a duplicate; verify on the site before retrying. Supported articleType values are site-dependent and not enumerable, and the connected app must keep a registered Stack Apps post or writes fail.
 */
const tool = createTool({
    name: 'create-article',
    description: 'Publish a new article with a title, Markdown body, tags, and provider article classification.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use to publish an article as the connected user with appropriate site privileges. Supply ordinary title/Markdown text, tag names and an articleType supported by the site, such as announcement where available. Use `list-articles` or `get-article` to inspect existing classifications. This creates published content; inspect the site before retrying uncertain writes.',
        requiredScopes: ['write_access'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response;
        // @allowTryCatch: provider write failures must be remapped to the tool's public error codes, so the proxy call error is intercepted.
        try {
            // https://api.stackexchange.com/docs/create-article
            response = await nango.post({
                endpoint: '/2.3/articles/add',
                params: {
                    site: input.site,
                    filter: 'withbody',
                    request_id: randomUUID()
                },
                data: {
                    title: input.title,
                    body: input.bodyMarkdown,
                    tags: input.tags.join(';'),
                    article_type: input.articleType
                },
                // Creating an article is not idempotent: the provider answers a repeated request_id with an error instead of the original result, so a retry after a lost response would not resume safely.
                retries: 0
            });
        } catch (err) {
            throw toPublicError(err);
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        const article = parsed.success ? parsed.data.items?.[0] : undefined;
        if (article === undefined) {
            throw new Error(
                'write_result_unavailable: the article may have been created, but the provider response could not be mapped; check list-articles and the site before retrying.'
            );
        }

        return {
            id: String(article.article_id),
            site: input.site,
            title: decodeHtmlEntities(article.title),
            articleType: article.article_type,
            bodyHtml: article.body,
            tags: article.tags,
            ...(article.link !== undefined && { link: article.link }),
            ...(article.body_markdown !== undefined && { bodyMarkdown: article.body_markdown }),
            ...(article.creation_date !== undefined && { createdAt: new Date(article.creation_date * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z') })
        };
    }
});

export default tool;
