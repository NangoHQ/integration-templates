import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Algolia index name. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('Synonym object ID. Example: "nango-test-syn-delete-1"')
});

const ProviderResponseSchema = z.object({
    taskID: z.number(),
    deletedAt: z.string().optional()
});

const OutputSchema = z.object({
    taskID: z.number(),
    deletedAt: z.string().optional()
});

const action = createAction({
    description: 'Delete a synonym from an Algolia index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#delete-a-synonym
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/synonyms/${encodeURIComponent(input.objectID)}`,
            retries: 3
        };

        const response = await nango.delete(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            taskID: providerResponse.taskID,
            ...(providerResponse.deletedAt !== undefined && { deletedAt: providerResponse.deletedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
