import { z } from 'zod';
import { createAction } from 'nango';

import { enqueuedTaskSchema, filterSchema } from '../helpers/schemas.js';

import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    indexUid: z.string().describe('Uid of the Meilisearch index. Example: "movies"'),
    ids: z
        .array(z.union([z.string(), z.number()]))
        .min(1)
        .optional()
        .describe('Document ids to delete. Provide exactly one of "ids" or "filter".'),
    filter: filterSchema.optional().describe('Filter expression selecting the documents to delete. Provide exactly one of "ids" or "filter".')
});

const action = createAction({
    description: 'Delete documents from a Meilisearch index by ids or by filter (exactly one must be provided). Returns the enqueued task.',
    version: '1.0.0',
    scopes: ['documents.delete'],

    input: InputSchema,
    output: enqueuedTaskSchema,

    exec: async (nango, input): Promise<z.infer<typeof enqueuedTaskSchema>> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: InputSchema, input });

        const hasIds = parsedInput.data.ids !== undefined;
        const hasFilter = parsedInput.data.filter !== undefined;
        if (hasIds === hasFilter) {
            throw new nango.ActionError({ message: 'Provide exactly one of "ids" or "filter".' });
        }

        const config: ProxyConfiguration = {
            // https://www.meilisearch.com/docs/reference/api/documents#delete-documents-by-batch
            // https://www.meilisearch.com/docs/reference/api/documents#delete-documents-by-filter
            endpoint: hasIds
                ? `/indexes/${encodeURIComponent(parsedInput.data.indexUid)}/documents/delete-batch`
                : `/indexes/${encodeURIComponent(parsedInput.data.indexUid)}/documents/delete`,
            data: hasIds ? parsedInput.data.ids : { filter: parsedInput.data.filter },
            retries: 3
        };

        const response = await nango.post(config);

        return enqueuedTaskSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
