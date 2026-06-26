import { z } from 'zod';
import { createAction } from 'nango';

const ContentsTextSchema = z
    .boolean()
    .or(
        z.object({
            maxCharacters: z.number().optional(),
            includeHtmlTags: z.boolean().optional(),
            verbosity: z.enum(['compact', 'standard', 'full']).optional(),
            includeSections: z.array(z.string()).optional(),
            excludeSections: z.array(z.string()).optional()
        })
    )
    .optional();

const ContentsHighlightsSchema = z
    .boolean()
    .or(
        z.object({
            query: z.string().optional(),
            maxCharacters: z.number().optional()
        })
    )
    .optional();

const ContentsSummarySchema = z
    .object({
        query: z.string().optional(),
        schema: z.object({}).passthrough().optional()
    })
    .optional();

const ContentsExtrasSchema = z
    .object({
        links: z.number().optional(),
        imageLinks: z.number().optional(),
        richImageLinks: z.number().optional(),
        richLinks: z.number().optional()
    })
    .optional();

const ContentsSchema = z
    .object({
        text: ContentsTextSchema,
        highlights: ContentsHighlightsSchema,
        summary: ContentsSummarySchema,
        extras: ContentsExtrasSchema
    })
    .optional();

const InputSchema = z.object({
    url: z.string().describe('The seed URL for which to find similar pages. Example: "https://arxiv.org/abs/2307.06435"'),
    numResults: z.number().int().min(1).max(100).optional().describe('Number of results to return. Default: 10. Maximum public limit is 100.'),
    excludeSourceDomain: z.boolean().optional().describe('If true, results from the same domain as the input URL are excluded.'),
    category: z
        .enum(['company', 'research paper', 'news', 'pdf', 'github', 'tweet', 'personal site', 'linkedin profile'])
        .optional()
        .describe('Category filter to focus the search on a specific type of content.'),
    includeDomains: z.array(z.string()).optional().describe('List of domains to include in results.'),
    excludeDomains: z.array(z.string()).optional().describe('List of domains to exclude from results.'),
    startPublishedDate: z.string().optional().describe('Only include links with a published date after this date. ISO 8601 format.'),
    endPublishedDate: z.string().optional().describe('Only include links with a published date before this date. ISO 8601 format.'),
    contents: ContentsSchema.describe('Inline content options (text, highlights, summary, extras) to fetch in the same call.')
});

const SubpageSchema = z.object({
    id: z.string().optional(),
    title: z.string(),
    url: z.string(),
    publishedDate: z.string().optional(),
    author: z.string().nullable().optional(),
    image: z.string().optional(),
    favicon: z.string().optional()
});

const ResultSchema = z.object({
    id: z.string().describe('The result ID, which is the full URL string.'),
    title: z.string(),
    url: z.string(),
    score: z.number().optional().describe('Relevance score for the result.'),
    publishedDate: z.string().optional(),
    author: z.string().nullable().optional(),
    image: z.string().optional(),
    favicon: z.string().optional(),
    text: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    highlightScores: z.array(z.number()).optional(),
    summary: z.string().optional(),
    subpages: z.array(SubpageSchema).optional(),
    extras: z.object({ links: z.array(z.string()).optional() }).optional(),
    entities: z.array(z.unknown()).optional()
});

const CostDollarsSchema = z
    .object({
        total: z.number().optional(),
        search: z.object({ neural: z.number().optional() }).optional(),
        breakDown: z.array(z.object({}).passthrough()).optional()
    })
    .optional();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    results: z.array(ResultSchema),
    costDollars: CostDollarsSchema
});

const action = createAction({
    description: 'Find pages semantically similar to a given URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/find-similar',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            url: input.url
        };

        if (input.numResults !== undefined) {
            body['numResults'] = input.numResults;
        }
        if (input.excludeSourceDomain !== undefined) {
            body['excludeSourceDomain'] = input.excludeSourceDomain;
        }
        if (input.category !== undefined) {
            body['category'] = input.category;
        }
        if (input.includeDomains !== undefined) {
            body['includeDomains'] = input.includeDomains;
        }
        if (input.excludeDomains !== undefined) {
            body['excludeDomains'] = input.excludeDomains;
        }
        if (input.startPublishedDate !== undefined) {
            body['startPublishedDate'] = input.startPublishedDate;
        }
        if (input.endPublishedDate !== undefined) {
            body['endPublishedDate'] = input.endPublishedDate;
        }
        if (input.contents !== undefined) {
            body['contents'] = input.contents;
        }

        const response = await nango.post({
            // https://docs.exa.ai/reference/find-similar-links
            endpoint: '/findSimilar',
            data: body,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);

        return {
            requestId: parsed.requestId,
            results: parsed.results,
            costDollars: parsed.costDollars
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
