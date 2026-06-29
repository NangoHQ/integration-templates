import { z } from 'zod';
import { createAction } from 'nango';

const TextInputSchema = z
    .object({
        maxCharacters: z.number().optional(),
        includeHtmlTags: z.boolean().optional()
    })
    .optional();

const HighlightsInputSchema = z
    .object({
        numSentences: z.number().optional(),
        highlightsPerUrl: z.number().optional(),
        query: z.string().optional()
    })
    .optional();

const SummaryInputSchema = z
    .object({
        query: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).describe('Document IDs (URLs) to retrieve content for. Example: ["https://example.com"]'),
    text: TextInputSchema,
    highlights: HighlightsInputSchema,
    summary: SummaryInputSchema,
    livecrawl: z.enum(['never', 'fallback', 'always', 'auto']).optional()
});

const StatusErrorSchema = z.object({
    tag: z.string(),
    httpStatusCode: z.number().nullable()
});

const StatusSchema = z.object({
    id: z.string(),
    status: z.enum(['success', 'error']),
    source: z.enum(['cached', 'crawled']).optional(),
    error: StatusErrorSchema.nullable().optional()
});

const ResultSchema = z.object({
    title: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    id: z.string().nullable().optional(),
    publishedDate: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    favicon: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    highlights: z.array(z.string()).nullable().optional(),
    highlightScores: z.array(z.number()).nullable().optional(),
    summary: z.string().nullable().optional(),
    subpages: z.array(z.unknown()).nullable().optional(),
    extras: z
        .object({
            links: z.array(z.string()).optional()
        })
        .nullable()
        .optional()
});

const CostDollarsSchema = z
    .object({
        total: z.number().optional(),
        search: z.object({ neural: z.number().optional() }).optional()
    })
    .optional();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    results: z.array(ResultSchema),
    statuses: z.array(StatusSchema),
    costDollars: CostDollarsSchema
});

const action = createAction({
    description: 'Retrieve full page text, highlights, or a summary for one or more URLs.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-contents'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.text && !input.highlights && !input.summary) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one content option must be provided: text, highlights, or summary.'
            });
        }

        // https://docs.exa.ai/reference/contents
        const response = await nango.post({
            endpoint: '/contents',
            data: {
                ids: input.ids,
                ...(input.text !== undefined && { text: input.text }),
                ...(input.highlights !== undefined && { highlights: input.highlights }),
                ...(input.summary !== undefined && { summary: input.summary }),
                ...(input.livecrawl !== undefined && { livecrawl: input.livecrawl })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                requestId: z.string().optional(),
                results: z.array(z.unknown()).optional(),
                statuses: z.array(z.unknown()).optional(),
                costDollars: CostDollarsSchema
            })
            .parse(response.data);

        const results = (providerResponse.results || []).map((item: unknown) => {
            const parsed = ResultSchema.parse(item);
            return {
                ...(parsed.title !== undefined && parsed.title !== null && { title: parsed.title }),
                ...(parsed.url !== undefined && parsed.url !== null && { url: parsed.url }),
                ...(parsed.id !== undefined && parsed.id !== null && { id: parsed.id }),
                ...(parsed.publishedDate !== undefined && parsed.publishedDate !== null && { publishedDate: parsed.publishedDate }),
                ...(parsed.author !== undefined && parsed.author !== null && { author: parsed.author }),
                ...(parsed.image !== undefined && parsed.image !== null && { image: parsed.image }),
                ...(parsed.favicon !== undefined && parsed.favicon !== null && { favicon: parsed.favicon }),
                ...(parsed.text !== undefined && parsed.text !== null && { text: parsed.text }),
                ...(parsed.highlights !== undefined && parsed.highlights !== null && { highlights: parsed.highlights }),
                ...(parsed.highlightScores !== undefined && parsed.highlightScores !== null && { highlightScores: parsed.highlightScores }),
                ...(parsed.summary !== undefined && parsed.summary !== null && { summary: parsed.summary }),
                ...(parsed.subpages !== undefined && parsed.subpages !== null && { subpages: parsed.subpages }),
                ...(parsed.extras !== undefined && parsed.extras !== null && { extras: parsed.extras })
            };
        });

        const statuses = (providerResponse.statuses || []).map((item: unknown) => {
            const parsed = StatusSchema.parse(item);
            return {
                id: parsed.id,
                status: parsed.status,
                ...(parsed.source !== undefined && { source: parsed.source }),
                ...(parsed.error !== undefined && parsed.error !== null && { error: parsed.error })
            };
        });

        return {
            ...(providerResponse.requestId !== undefined && { requestId: providerResponse.requestId }),
            results,
            statuses,
            ...(providerResponse.costDollars !== undefined && { costDollars: providerResponse.costDollars })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
