import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('ID of the object to delete. Example: "nango-test-obj-delete-1"')
});

const ProviderDeleteObjectSchema = z.object({
    taskID: z.number(),
    deletedAt: z.string()
});

const OutputSchema = z.object({
    taskID: z.number().describe('Algolia task ID for the deletion operation.'),
    deletedAt: z.string().describe('ISO 8601 timestamp when the object was deleted.')
});

const action = createAction({
    description: 'Delete an object from an Algolia index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'], // Algolia write operations typically need search scope

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.algolia.com/doc/rest-api/search/#delete-object
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.objectID)}`,
            retries: 1
        });

        const providerData = ProviderDeleteObjectSchema.parse(response.data);

        return {
            taskID: providerData.taskID,
            deletedAt: providerData.deletedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
