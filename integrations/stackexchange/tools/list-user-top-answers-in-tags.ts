import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createTool } from 'nango';

const IntegerSortBoundSchema = z.custom<number>((value) => typeof value === 'number' && Number.isInteger(value)).meta({ type: 'integer' });

const InputSchema = z
    .object({
        site: z.string().min(1).describe('Site API identifier.'),
        userId: z
            .string()
            .regex(/^-?[0-9]+$/)
            .describe('Opaque ID of the answer author on this site.'),
        tags: z
            .array(
                z
                    .string()
                    .min(1)
                    .regex(/^[^;]+$/)
            )
            .min(1)
            .max(5)
            .meta({ uniqueItems: true })
            .describe('One to five question tag names, such as c#; do not pre-encode them.'),
        sort: z.enum(['activity', 'creation', 'votes']).optional().describe('Order the top-answer view by last activity, creation or score.'),
        order: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum answers in this page; the underlying top view contains at most 30.'),
        min: z
            .union([IntegerSortBoundSchema, z.string()])
            .optional()
            .describe('Inclusive lower sort bound: integer score for votes, otherwise a whole-second RFC 3339 timestamp with offset.'),
        max: z.union([IntegerSortBoundSchema, z.string()]).optional().describe('Inclusive upper sort bound, represented as min.'),
        createdFrom: z.iso.datetime({ offset: true }).optional().describe('Inclusive answer creation lower bound, explicit offset and whole seconds required.'),
        createdTo: z.iso.datetime({ offset: true }).optional().describe('Inclusive answer creation upper bound, explicit offset and whole seconds required.'),
        cursor: z.string().min(1).optional().describe('Continuation for this exact top-answer query.')
    })
    .describe('Filters selecting one page of the top answers a user posted to questions with the given tags.');

const OutputItemSchema = z.object({
    id: z.string().describe('Opaque answer ID on the selected site.'),
    link: z.string().optional().describe('Public answer link, when returned.'),
    site: z.string().describe('Site API identifier.'),
    score: z.number().int().describe('Answer vote score, which may be negative.'),
    title: z.string().optional().describe('Question title associated with the answer, decoded as ordinary text.'),
    userId: z.string().optional().describe("Author's site user ID, taken from the query context."),
    bodyHtml: z.string().optional().describe('Answer HTML, unchanged in content; not encoded text or Markdown.'),
    createdAt: z.iso.datetime({ offset: true }).optional().describe('Answer creation in UTC, whole seconds.'),
    isAccepted: z.boolean().optional().describe("Whether this answer is the question's accepted answer, when returned."),
    questionId: z.string().optional().describe('Parent question ID, when returned.'),
    lastActivityAt: z.iso.datetime({ offset: true }).optional().describe('Last answer activity in UTC, whole seconds.')
});

const OutputSchema = z
    .object({
        items: z.array(OutputItemSchema).describe('Answers in provider order from the top-30 view.'),
        nextCursor: z.string().optional().describe('Next page in this view; omitted when has_more is false.')
    })
    .describe('One page of top answers in provider order, plus the continuation cursor for this exact query.');

const ProviderAnswerSchema = z.object({
    answer_id: z.number().int(),
    score: z.number().int(),
    title: z.string().optional(),
    body: z.string().optional(),
    link: z.string().optional(),
    is_accepted: z.boolean().optional(),
    question_id: z.number().int().optional(),
    creation_date: z.number().int().optional(),
    last_activity_date: z.number().int().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderAnswerSchema),
    has_more: z.boolean().optional(),
    backoff: z.number().int().optional()
});

const ProviderErrorBodySchema = z.object({
    error_id: z.number().optional(),
    error_name: z.string().optional(),
    error_message: z.string().optional()
});

const ProxyErrorSchema = z.object({
    message: z.string().optional(),
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const NAMED_HTML_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'"
};

function codePointToString(codePoint: number, fallback: string): string {
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return fallback;
    }
    return String.fromCodePoint(codePoint);
}

function decodeHtmlEntities(text: string): string {
    return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, body: string) => {
        if (body.startsWith('#x') || body.startsWith('#X')) {
            return codePointToString(Number.parseInt(body.slice(2), 16), entity);
        }
        if (body.startsWith('#')) {
            return codePointToString(Number(body.slice(1)), entity);
        }
        return NAMED_HTML_ENTITIES[body.toLowerCase()] ?? entity;
    });
}

function epochSecondsToIso(seconds: number): string {
    return `${new Date(seconds * 1000).toISOString().slice(0, 19)}Z`;
}

function toEpochSeconds(value: string, field: string): number {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value)) {
        throw new Error(`invalid_query: ${field} must be a whole-second RFC 3339 timestamp with an explicit offset and no fractions.`);
    }
    const milliseconds = Date.parse(value);
    if (Number.isNaN(milliseconds)) {
        throw new Error(`invalid_query: ${field} is not a valid calendar date.`);
    }
    const seconds = milliseconds / 1000;
    if (!Number.isSafeInteger(seconds)) {
        throw new Error(`invalid_query: ${field} is out of range.`);
    }
    return seconds;
}

function toSortBound(value: number | string, sort: 'activity' | 'creation' | 'votes', field: 'min' | 'max'): number {
    if (sort === 'votes') {
        if (typeof value === 'number') {
            if (!Number.isSafeInteger(value)) {
                throw new Error(`invalid_query: ${field} must be a safe integer vote score.`);
            }
            return value;
        }
        if (!/^-?\d+$/.test(value)) {
            throw new Error(`invalid_query: ${field} must be an integer vote score when sort is votes.`);
        }
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed)) {
            throw new Error(`invalid_query: ${field} is out of range.`);
        }
        return parsed;
    }
    if (typeof value !== 'string') {
        throw new Error(`invalid_query: ${field} must be a whole-second RFC 3339 timestamp with an offset when sort is ${sort}.`);
    }
    return toEpochSeconds(value, field);
}

function mapProviderError(err: unknown): Error {
    const original = err instanceof Error ? err : new Error(String(err));
    const parsed = ProxyErrorSchema.safeParse(err);
    if (!parsed.success) {
        return original;
    }
    const status = parsed.data.response?.status;
    const body = ProviderErrorBodySchema.safeParse(parsed.data.response?.data);
    const errorName = body.success ? body.data.error_name : undefined;
    const errorId = body.success ? body.data.error_id : undefined;
    const detail = (body.success ? body.data.error_message : undefined) ?? parsed.data.message ?? 'The provider rejected the request.';
    const code = errorName ?? (errorId !== undefined ? String(errorId) : undefined) ?? (status !== undefined ? String(status) : undefined);
    switch (code) {
        case 'bad_parameter':
        case '400':
            return new Error(`bad_parameter: ${detail}`);
        case 'access_denied':
        case '403':
            return new Error(`access_denied: ${detail}`);
        case 'internal_error':
        case '500':
            return new Error(`internal_error: ${detail}`);
        case 'throttle_violation':
        case '502':
            return new Error(`throttle_violation: ${detail}`);
        case 'temporarily_unavailable':
        case '503':
            return new Error(`temporarily_unavailable: ${detail}`);
        default:
            return original;
    }
}

/**
 * @tags: [read]
 * @tagReason: Performs a single GET against the Stack Exchange top-answers endpoint and never mutates provider data.
 * @pitfalls: The provider can attach a required backoff to any response and drops bursts of requests, so repeating this call in quick succession — especially the identical query more than once per minute — can end in throttle_violation, which requires waiting for the backoff or quota reset.
 */
const tool = createTool({
    name: 'list-user-top-answers-in-tags',
    description: "List one page from the provider's top 30 answers a user posted to questions with up to five specified tags.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use a site user ID from `list-users` or `get-user` and one to five ordinary tag names. This is a top-30 view, not all answers by that user. Use `list-user-top-tags` to discover expertise tags. Continue using nextCursor with identical arguments.',
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const sort = input.sort ?? 'activity';
        const order = input.order ?? 'desc';
        const limit = input.limit ?? 30;

        if (new Set(input.tags).size !== input.tags.length) {
            throw new Error('invalid_query: tags must not contain duplicates.');
        }

        const minBound = input.min !== undefined ? toSortBound(input.min, sort, 'min') : undefined;
        const maxBound = input.max !== undefined ? toSortBound(input.max, sort, 'max') : undefined;
        if (minBound !== undefined && maxBound !== undefined && minBound > maxBound) {
            throw new Error('invalid_query: min must not exceed max.');
        }

        const fromdate = input.createdFrom !== undefined ? toEpochSeconds(input.createdFrom, 'createdFrom') : undefined;
        const todate = input.createdTo !== undefined ? toEpochSeconds(input.createdTo, 'createdTo') : undefined;
        if (fromdate !== undefined && todate !== undefined && fromdate > todate) {
            throw new Error('invalid_query: createdFrom must not be after createdTo.');
        }

        const fingerprint = createHash('sha256')
            .update(
                JSON.stringify({
                    site: input.site,
                    userId: input.userId,
                    tags: input.tags,
                    sort,
                    order,
                    limit,
                    min: minBound ?? null,
                    max: maxBound ?? null,
                    fromdate: fromdate ?? null,
                    todate: todate ?? null
                })
            )
            .digest('hex')
            .slice(0, 16);

        let page = 1;
        if (input.cursor !== undefined) {
            if (!/^[1-9]\d*\.[0-9a-f]{16}$/.test(input.cursor)) {
                throw new Error('invalid_cursor: The cursor is malformed. Restart without a cursor.');
            }
            const dotIndex = input.cursor.indexOf('.');
            const pageText = input.cursor.slice(0, dotIndex);
            const cursorFingerprint = input.cursor.slice(dotIndex + 1);
            if (cursorFingerprint !== fingerprint) {
                throw new Error('invalid_cursor: The cursor does not match these arguments. Restart without a cursor or with identical arguments.');
            }
            const parsedPage = Number(pageText);
            if (!Number.isSafeInteger(parsedPage)) {
                throw new Error('invalid_cursor: The cursor is malformed. Restart without a cursor.');
            }
            page = parsedPage;
        }

        const tagsPath = input.tags.map((tag) => encodeURIComponent(tag)).join(';');

        // https://api.stackexchange.com/docs/top-user-answers-in-tags
        const response = await nango
            .get({
                endpoint: `/2.3/users/${encodeURIComponent(input.userId)}/tags/${tagsPath}/top-answers`,
                params: {
                    site: input.site,
                    page: 1,
                    pagesize: limit,
                    order,
                    sort,
                    filter: 'withbody',
                    ...(minBound !== undefined && { min: minBound }),
                    ...(maxBound !== undefined && { max: maxBound }),
                    ...(fromdate !== undefined && { fromdate }),
                    ...(todate !== undefined && { todate })
                },
                retries: 3
            })
            .catch((err: unknown) => {
                throw mapProviderError(err);
            });

        const data = ProviderResponseSchema.parse(response.data);

        if (data.backoff !== undefined) {
            await nango.log(`The provider requested a backoff of ${data.backoff} seconds before this endpoint is called again.`);
        }

        const items = data.items.map((answer) => ({
            id: String(answer.answer_id),
            site: input.site,
            score: answer.score,
            userId: input.userId,
            ...(answer.title !== undefined && { title: decodeHtmlEntities(answer.title) }),
            ...(answer.body !== undefined && { bodyHtml: answer.body }),
            ...(answer.creation_date !== undefined && { createdAt: epochSecondsToIso(answer.creation_date) }),
            ...(answer.is_accepted !== undefined && { isAccepted: answer.is_accepted }),
            ...(answer.question_id !== undefined && { questionId: String(answer.question_id) }),
            ...(answer.last_activity_date !== undefined && { lastActivityAt: epochSecondsToIso(answer.last_activity_date) }),
            ...(answer.link !== undefined && { link: answer.link })
        }));

        return {
            items,
            ...(data.has_more === true && { nextCursor: `${page + 1}.${fingerprint}` })
        };
    }
});

export default tool;
