import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index containing the object. Example: "algolia_movie_sample_dataset"'),
    objectID: z.string().describe('ID of the object to partially update. Example: "nango-test-obj-get"'),
    attributes: z.record(z.string(), z.unknown()).describe('Attributes to update on the object. Only first-level attributes are supported.')
});

const ProviderResponseSchema = z.object({
    objectID: z.string(),
    updatedAt: z.string().optional(),
    taskID: z.number().optional()
});

const OutputSchema = z.object({
    objectID: z.string(),
    updatedAt: z.string().optional(),
    taskID: z.number().optional()
});

const action = createAction({
    description: 'Update specific attributes of an existing Algolia object without replacing the whole record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/partial-update-object',
        group: 'Objects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['addObject'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.algolia.com/doc/rest-api/search/#update-an-object-partially
        const response = await nango.post({
            endpoint: `/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.objectID)}/partial`,
            params: {
                createIfNotExists: 'false'
            },
            data: input.attributes,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            objectID: providerResponse.objectID,
            ...(providerResponse.updatedAt !== undefined && { updatedAt: providerResponse.updatedAt }),
            ...(providerResponse.taskID !== undefined && { taskID: providerResponse.taskID })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
