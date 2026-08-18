import { z } from 'zod';
import { createAction } from 'nango';

import { filterSchema, meiliDocumentSchema } from '../helpers/schemas.js';

import type { ProxyConfiguration } from 'nango';

// Loose: extra keys are forwarded to Meilisearch so callers can use any
// supported fetch param without a schema change.
const InputSchema = z.looseObject({
    indexUid: z.string().describe('Uid of the Meilisearch index. Example: "movies"'),
    ids: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe('Specific document ids to fetch.'),
    filter: filterSchema.optional().describe('Filter expression selecting the documents to fetch.'),
    fields: z.array(z.string()).optional(),
    limit: z.number().int().nonnegative().optional(),
    offset: z.number().int().nonnegative().optional()
});

const OutputSchema = z
    .object({
        results: z.array(meiliDocumentSchema),
        total: z.number(),
        limit: z.number(),
        offset: z.number()
    })
    .catchall(z.unknown());

const action = createAction({
    description: 'Fetch documents from a Meilisearch index, optionally filtered or by ids.',
    version: '1.0.0',
    scopes: ['documents.get'],

    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: InputSchema, input });
        const { indexUid, ...body } = parsedInput.data;

        const config: ProxyConfiguration = {
            // https://www.meilisearch.com/docs/reference/api/documents#fetch-documents-with-post
            endpoint: `/indexes/${encodeURIComponent(indexUid)}/documents/fetch`,
            data: body,
            retries: 3
        };

        const response = await nango.post(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
