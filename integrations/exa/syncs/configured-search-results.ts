import { createSync } from 'nango';
import { z } from 'zod';

const QueryConfigSchema = z.object({
    query: z.string().min(1),
    type: z.string().optional(),
    category: z.string().optional(),
    includeDomains: z.array(z.string()).optional(),
    excludeDomains: z.array(z.string()).optional()
});

const MetadataSchema = z.object({
    queries: z.array(QueryConfigSchema)
});

const QueryCheckpointSchema = z.object({
    published_after: z.string().optional(),
    seen_ids: z.array(z.string()).optional()
});

const QueryStatesSchema = z.record(z.string(), QueryCheckpointSchema);

const CheckpointSchema = z.object({
    state: z.string()
});

const ExaSearchResultSchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        url: z.string().optional(),
        publishedDate: z.string().optional(),
        author: z.string().nullable().optional(),
        image: z.string().optional(),
        favicon: z.string().optional(),
        text: z.string().optional(),
        summary: z.string().optional(),
        highlights: z.array(z.string()).optional(),
        highlightScores: z.array(z.number()).optional()
    })
    .passthrough();

const ExaSearchResponseSchema = z
    .object({
        results: z.array(ExaSearchResultSchema).optional(),
        requestId: z.string().optional(),
        resolvedSearchType: z.string().optional(),
        context: z.string().optional(),
        costDollars: z.unknown().optional()
    })
    .passthrough();

const SearchResultSchema = z.object({
    id: z.string(),
    query: z.string(),
    title: z.string(),
    url: z.string(),
    publishedDate: z.string(),
    author: z.string().optional(),
    text: z.string().optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    highlightScores: z.array(z.number()).optional()
});

type SearchResult = z.infer<typeof SearchResultSchema>;
type QueryStates = z.infer<typeof QueryStatesSchema>;

const sync = createSync({
    description: 'Periodically run saved Exa search queries and sync new results.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/configured-search-results' }],
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        SearchResult: SearchResultSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const checkpoint = await nango.getCheckpoint();

        if (!metadata.queries || metadata.queries.length === 0) {
            throw new Error('No queries configured in metadata');
        }

        let queryStates: QueryStates = {};
        if (checkpoint) {
            const parsed = QueryStatesSchema.safeParse(JSON.parse(checkpoint.state));
            if (parsed.success) {
                queryStates = parsed.data;
            }
        }

        for (const queryConfig of metadata.queries) {
            const queryKey = [
            queryConfig.query,
            queryConfig.type ?? '',
            queryConfig.category ?? '',
            (queryConfig.includeDomains ?? []).slice().sort().join(','),
            (queryConfig.excludeDomains ?? []).slice().sort().join(',')
        ].join('\0');
            const queryState = queryStates[queryKey] ?? {};
            const publishedAfter = queryState.published_after;
            const seenIds = new Set(queryState.seen_ids ?? []);

            const requestBody: Record<string, unknown> = {
                query: queryConfig.query,
                numResults: 100,
                contents: {
                    text: true
                }
            };

            if (queryConfig.type) {
                requestBody['type'] = queryConfig.type;
            }
            if (queryConfig.category) {
                requestBody['category'] = queryConfig.category;
            }
            if (queryConfig.includeDomains) {
                requestBody['includeDomains'] = queryConfig.includeDomains;
            }
            if (queryConfig.excludeDomains) {
                requestBody['excludeDomains'] = queryConfig.excludeDomains;
            }
            // startPublishedDate is not supported for company/people categories
            if (publishedAfter && queryConfig.category !== 'company' && queryConfig.category !== 'people') {
                requestBody['startPublishedDate'] = publishedAfter;
            }

            // https://docs.exa.ai/reference/search
            const response = await nango.post({
                endpoint: '/search',
                data: requestBody,
                retries: 3
            });

            const parsedResponse = ExaSearchResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error('Failed to parse search response: ' + parsedResponse.error.message);
            }

            const rawResults = parsedResponse.data.results ?? [];
            const results: SearchResult[] = [];
            let maxPublishedDate: string | undefined;
            const newSeenIds: string[] = [];

            for (const rawResult of rawResults) {
                const resultId = rawResult.id;
                const publishedDate = rawResult.publishedDate;

                if (!publishedDate) {
                    continue;
                }

                if (publishedAfter) {
                    if (publishedDate < publishedAfter) {
                        continue;
                    }
                    if (publishedDate === publishedAfter && seenIds.has(resultId)) {
                        continue;
                    }
                }

                const mappedResult = {
                    id: resultId,
                    query: queryConfig.query,
                    title: rawResult.title ?? '',
                    url: rawResult.url ?? '',
                    publishedDate: publishedDate,
                    ...(rawResult.author != null && { author: rawResult.author }),
                    ...(rawResult.text != null && { text: rawResult.text }),
                    ...(rawResult.summary != null && { summary: rawResult.summary }),
                    ...(rawResult.highlights != null && { highlights: rawResult.highlights }),
                    ...(rawResult.highlightScores != null && { highlightScores: rawResult.highlightScores })
                };

                results.push(mappedResult);

                if (maxPublishedDate === undefined || publishedDate > maxPublishedDate) {
                    maxPublishedDate = publishedDate;
                    newSeenIds.length = 0;
                    newSeenIds.push(resultId);
                } else if (publishedDate === maxPublishedDate) {
                    newSeenIds.push(resultId);
                }
            }

            results.sort((a, b) => {
                if (a.publishedDate > b.publishedDate) {
                    return -1;
                }
                if (a.publishedDate < b.publishedDate) {
                    return 1;
                }
                return 0;
            });

            if (results.length > 0) {
                await nango.batchSave(results, 'SearchResult');
            }

            if (maxPublishedDate !== undefined) {
                queryStates = {
                    ...queryStates,
                    [queryKey]: {
                        published_after: maxPublishedDate,
                        seen_ids: newSeenIds
                    }
                };
                await nango.saveCheckpoint({
                    state: JSON.stringify(queryStates)
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
