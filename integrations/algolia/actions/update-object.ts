import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    index_name: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    object_id: z.string().describe('ID of the object to update. Example: "nango-test-obj-update-1"'),
    object: z.record(z.string(), z.unknown()).describe('Full object payload to replace the existing record.')
});

const ProviderResponseSchema = z.object({
    objectID: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    taskID: z.union([z.number(), z.string()]).optional()
});

const OutputSchema = z.object({
    object_id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    task_id: z.union([z.number(), z.string()]).optional()
});

const action = createAction({
    description: 'Replace an Algolia object entirely (full overwrite by objectID).',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-object',
        group: 'Objects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['search'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.algolia.com/doc/rest-api/search/#add-or-update-object
            endpoint: `/1/indexes/${encodeURIComponent(input.index_name)}/${encodeURIComponent(input.object_id)}`,
            data: input.object,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            object_id: providerResponse.objectID,
            ...(providerResponse.createdAt !== undefined && { created_at: providerResponse.createdAt }),
            ...(providerResponse.updatedAt !== undefined && { updated_at: providerResponse.updatedAt }),
            ...(providerResponse.taskID !== undefined && { task_id: providerResponse.taskID })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
