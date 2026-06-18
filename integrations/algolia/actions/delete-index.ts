import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index to delete. Example: "my-index"')
});

const ProviderResponseSchema = z.object({
    taskID: z.number(),
    deletedAt: z.string()
});

const OutputSchema = z.object({
    taskID: z.number(),
    deletedAt: z.string()
});

const action = createAction({
    description: 'Delete an Algolia index and all its objects.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.algolia.com/doc/rest-api/search/delete-index
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            taskID: providerResponse.taskID,
            deletedAt: providerResponse.deletedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
