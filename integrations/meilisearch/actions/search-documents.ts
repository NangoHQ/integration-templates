import { z } from 'zod';
import { createAction } from 'nango';

import { filterSchema, meiliDocumentSchema } from '../helpers/schemas.js';

import type { ProxyConfiguration } from 'nango';

// Loose: extra keys are forwarded to Meilisearch so callers can use any
// supported search param (e.g. hybrid, showRankingScore) without a schema change.
const InputSchema = z.looseObject({
    indexUid: z.string().describe('Uid of the Meilisearch index. Example: "movies"'),
    q: z.string().optional().describe('Search query.'),
    filter: filterSchema.optional().describe('Filter expression applied to the search.'),
    sort: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    attributesToRetrieve: z.array(z.string()).optional(),
    facets: z.array(z.string()).optional()
});

const OutputSchema = z
    .object({
        hits: z.array(meiliDocumentSchema),
        query: z.string().optional(),
        processingTimeMs: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        estimatedTotalHits: z.number().optional()
    })
    .catchall(z.unknown());

const action = createAction({
    description: 'Search documents in a Meilisearch index.',
    version: '1.0.0',
    scopes: ['search'],

    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: InputSchema, input });
        const { indexUid, ...body } = parsedInput.data;

        const config: ProxyConfiguration = {
            // https://www.meilisearch.com/docs/reference/api/search#search-in-an-index-with-post
            endpoint: `/indexes/${encodeURIComponent(indexUid)}/search`,
            data: body,
            retries: 3
        };

        const response = await nango.post(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
