import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the source index to move. Example: "my-source-index"'),
    destinationIndexName: z
        .string()
        .describe(
            'Name of the destination index. The source index is renamed to this name, overwriting any existing index with the same name. Example: "my-destination-index"'
        )
});

const ProviderResponseSchema = z.object({
    taskID: z.number().describe('Algolia task ID for tracking the asynchronous operation.'),
    updatedAt: z.string().describe('ISO 8601 timestamp of when the move operation was submitted.')
});

const OutputSchema = z.object({
    taskID: z.number().describe('Algolia task ID for tracking the asynchronous operation.'),
    updatedAt: z.string().describe('ISO 8601 timestamp of when the move operation was submitted.')
});

const action = createAction({
    description: 'Rename an Algolia index by moving it to a new name (destructive — overwrites destination).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['addObject'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.algolia.com/doc/rest-api/search/#tag/Indices/operation/moveIndex
        const response = await nango.post({
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/operation`,
            data: {
                operation: 'move',
                destination: input.destinationIndexName
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            taskID: providerResponse.taskID,
            updatedAt: providerResponse.updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
