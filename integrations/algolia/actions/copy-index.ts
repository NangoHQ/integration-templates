import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sourceIndexName: z.string().describe('Name of the source index to copy. Example: "algolia_movie_sample_dataset"'),
    destinationIndexName: z.string().describe('Name of the destination index. Example: "nango_test_copy_index_destination"'),
    scope: z
        .array(z.enum(['settings', 'synonyms', 'rules']))
        .optional()
        .describe('Optional array of scopes to copy. If omitted, the entire index is copied.')
});

const ProviderResponseSchema = z.object({
    taskID: z.number(),
    updatedAt: z.string()
});

const OutputSchema = z.object({
    taskID: z.number().describe('The Algolia task ID for the copy operation'),
    updatedAt: z.string().describe('ISO 8601 timestamp of when the operation was performed')
});

const action = createAction({
    description: 'Copy an Algolia index to a new destination index.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['addObject'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.algolia.com/doc/rest-api/search/#copy-or-move-an-index
            endpoint: `/1/indexes/${encodeURIComponent(input.sourceIndexName)}/operation`,
            data: {
                operation: 'copy',
                destination: input.destinationIndexName,
                ...(input.scope !== undefined && { scope: input.scope })
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
