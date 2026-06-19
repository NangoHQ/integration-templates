import { z } from 'zod';
import { createAction } from 'nango';

const BatchActionSchema = z.enum(['addObject', 'updateObject', 'partialUpdateObject', 'partialUpdateObjectNoCreate', 'deleteObject', 'delete', 'clear']);

const BatchRequestSchema = z.object({
    action: BatchActionSchema,
    body: z.record(z.string(), z.unknown())
});

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    requests: z.array(BatchRequestSchema).describe('Batch operations to perform on the index.')
});

const ProviderBatchResponseSchema = z.object({
    taskID: z.number(),
    objectIDs: z.array(z.string())
});

const OutputSchema = z.object({
    taskID: z.number(),
    objectIDs: z.array(z.string())
});

const action = createAction({
    description: 'Batch create, update, or delete Algolia objects.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['addObject'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.algolia.com/doc/rest-api/search/#batch-objects
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/batch`,
            data: {
                requests: input.requests
            },
            retries: 3
        });

        const providerResponse = ProviderBatchResponseSchema.parse(response.data);

        return {
            taskID: providerResponse.taskID,
            objectIDs: providerResponse.objectIDs
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
