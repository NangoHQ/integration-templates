import { z } from 'zod';
import { createAction } from 'nango';

const TextInputSchema = z.object({
    maxCharacters: z.number().int().optional().describe('Maximum characters to return for page text.'),
    includeHtmlTags: z.boolean().optional().describe('Include HTML tags in returned text.')
});

const HighlightsInputSchema = z.object({
    numSentences: z.number().int().optional().describe('Number of highlight sentences per result.'),
    highlightsPerUrl: z.number().int().optional().describe('Number of highlights per URL.'),
    query: z.string().optional().describe('Custom query guiding highlight selection.')
});

const SummaryInputSchema = z.object({
    query: z.string().optional().describe('Custom query for LLM-generated summary.')
});

const InputSchema = z.object({
    query: z.string().min(1).describe('The search query string.'),
    type: z
        .enum(['neural', 'keyword', 'auto'])
        .optional()
        .describe("Search type: 'neural' for semantic, 'keyword' for exact-match, 'auto' for AI-selected (default)."),
    numResults: z.number().int().min(1).max(100).optional().describe('Number of results to return (default 10).'),
    useAutoprompt: z.boolean().optional().describe('Let the model rewrite the query for better neural results.'),
    category: z
        .enum(['company', 'research paper', 'news', 'pdf', 'github', 'tweet', 'personal site', 'linkedin profile'])
        .optional()
        .describe('Content category filter.'),
    includeDomains: z.array(z.string()).optional().describe('Only return results from these domains.'),
    excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains.'),
    startPublishedDate: z.string().optional().describe('ISO 8601 start published date filter.'),
    endPublishedDate: z.string().optional().describe('ISO 8601 end published date filter.'),
    startCrawlDate: z.string().optional().describe('ISO 8601 start crawl date filter.'),
    endCrawlDate: z.string().optional().describe('ISO 8601 end crawl date filter.'),
    text: TextInputSchema.optional().describe('Inline text extraction options (avoids separate /contents call).'),
    highlights: HighlightsInputSchema.optional().describe('Inline highlight extraction options (avoids separate /contents call).'),
    summary: SummaryInputSchema.optional().describe('Inline summary generation options (avoids separate /contents call).')
});

const ProviderResultSchema = z.object({
    id: z.string().describe('Result ID (the full URL).'),
    title: z.string().optional().describe('Title of the search result.'),
    url: z.string().optional().describe('URL of the search result.'),
    publishedDate: z.string().optional().describe('Estimated published date in ISO 8601 format.'),
    author: z.string().nullable().optional().describe('Author of the content, if available.'),
    score: z.number().optional().describe('Relevance score.'),
    image: z.string().optional().describe('URL of an image associated with the result.'),
    favicon: z.string().optional().describe('URL of the favicon for the result domain.'),
    text: z.string().optional().describe('Full page text, when requested via inline content.'),
    highlights: z.array(z.string()).optional().describe('Highlights extracted from the page, when requested via inline content.'),
    summary: z.string().optional().describe('LLM-generated summary, when requested via inline content.')
});

const CostDollarsSchema = z.object({
    total: z.number().optional().describe('Total cost in USD.'),
    search: z
        .object({
            neural: z.number().optional().describe('Cost for neural search.')
        })
        .optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional().describe('Unique identifier for the request.'),
    results: z.array(ProviderResultSchema),
    costDollars: CostDollarsSchema.optional().describe('Cost breakdown for the request.')
});

const action = createAction({
    description: 'Run an Exa neural or keyword search and return ranked results, optionally with inline page content.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            query: input.query
        };

        if (input.type !== undefined) {
            requestBody['type'] = input.type;
        }

        if (input.numResults !== undefined) {
            requestBody['numResults'] = input.numResults;
        }

        if (input.useAutoprompt !== undefined) {
            requestBody['useAutoprompt'] = input.useAutoprompt;
        }

        if (input.category !== undefined) {
            requestBody['category'] = input.category;
        }

        if (input.includeDomains !== undefined) {
            requestBody['includeDomains'] = input.includeDomains;
        }

        if (input.excludeDomains !== undefined) {
            requestBody['excludeDomains'] = input.excludeDomains;
        }

        if (input.startPublishedDate !== undefined) {
            requestBody['startPublishedDate'] = input.startPublishedDate;
        }

        if (input.endPublishedDate !== undefined) {
            requestBody['endPublishedDate'] = input.endPublishedDate;
        }

        if (input.startCrawlDate !== undefined) {
            requestBody['startCrawlDate'] = input.startCrawlDate;
        }

        if (input.endCrawlDate !== undefined) {
            requestBody['endCrawlDate'] = input.endCrawlDate;
        }

        const contents: Record<string, unknown> = {};
        if (input.text !== undefined) {
            contents['text'] = input.text;
        }
        if (input.highlights !== undefined) {
            contents['highlights'] = input.highlights;
        }
        if (input.summary !== undefined) {
            contents['summary'] = input.summary;
        }
        if (Object.keys(contents).length > 0) {
            requestBody['contents'] = contents;
        }

        // https://docs.exa.ai/reference/search
        const response = await nango.post({
            endpoint: '/search',
            data: requestBody,
            retries: 3
        });

        const providerResponse = z
            .object({
                requestId: z.string().optional(),
                results: z.array(z.unknown()),
                costDollars: z.unknown().optional()
            })
            .parse(response.data);

        const results = providerResponse.results.map((result: unknown) => {
            const parsed = ProviderResultSchema.safeParse(result);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_provider_response',
                    message: 'Provider returned a result that does not match the expected schema.',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const costDollars = providerResponse.costDollars !== undefined ? CostDollarsSchema.parse(providerResponse.costDollars) : undefined;

        return {
            requestId: providerResponse.requestId,
            results,
            costDollars
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
