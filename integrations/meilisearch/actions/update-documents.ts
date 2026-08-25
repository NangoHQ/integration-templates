import { z } from 'zod';
import { createAction } from 'nango';

import { enqueuedTaskSchema, meiliDocumentSchema } from '../helpers/schemas.js';

import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    indexUid: z.string().describe('Uid of the Meilisearch index. Example: "movies"'),
    documents: z.array(meiliDocumentSchema).min(1).describe('Partial documents to add or update (batch). Only provided fields change.'),
    primaryKey: z.string().optional().describe('Primary key field of the index, only needed on first write.')
});

const action = createAction({
    description: 'Add or partially update documents in a Meilisearch index (batch). Returns the enqueued task.',
    version: '1.0.0',
    scopes: ['documents.add'],

    input: InputSchema,
    output: enqueuedTaskSchema,

    exec: async (nango, input): Promise<z.infer<typeof enqueuedTaskSchema>> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: InputSchema, input });

        const config: ProxyConfiguration = {
            // https://www.meilisearch.com/docs/reference/api/documents#add-or-update-documents
            endpoint: `/indexes/${encodeURIComponent(parsedInput.data.indexUid)}/documents`,
            data: parsedInput.data.documents,
            ...(parsedInput.data.primaryKey ? { params: { primaryKey: parsedInput.data.primaryKey } } : {}),
            retries: 3
        };

        const response = await nango.put(config);

        return enqueuedTaskSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
