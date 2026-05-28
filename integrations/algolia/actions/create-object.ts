import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index. Example: "algolia_movie_sample_dataset"'),
    object: z
        .object({})
        .passthrough()
        .describe('The record to add. A schemaless object with attributes that are useful in the context of search and discovery.'),
    objectID: z.string().optional().describe('Optional object ID. If provided, the record is added or replaced at this ID instead of auto-generating one.')
});

const ProviderResponseSchema = z.object({
    objectID: z.string().optional(),
    taskID: z.number(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    objectID: z.string(),
    taskID: z.number(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create an object in an Algolia index. Returns a generated objectID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-object',
        group: 'Objects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['addObject'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedIndexName = encodeURIComponent(input.indexName);

        if (input.objectID) {
            const encodedObjectID = encodeURIComponent(input.objectID);
            const response = await nango.put({
                // https://www.algolia.com/doc/rest-api/search/add-or-update-object
                endpoint: `/1/indexes/${encodedIndexName}/${encodedObjectID}`,
                data: {
                    ...input.object,
                    objectID: input.objectID
                },
                retries: 3
            });

            const providerResponse = ProviderResponseSchema.parse(response.data);

            if (!providerResponse.objectID) {
                throw new nango.ActionError({
                    type: 'missing_object_id',
                    message: 'Algolia response did not include an objectID'
                });
            }

            return {
                objectID: providerResponse.objectID,
                taskID: providerResponse.taskID,
                ...(providerResponse.updatedAt !== undefined && { updatedAt: providerResponse.updatedAt })
            };
        }

        const response = await nango.post({
            // https://www.algolia.com/doc/rest-api/search/save-object
            endpoint: `/1/indexes/${encodedIndexName}`,
            data: input.object,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.objectID) {
            throw new nango.ActionError({
                type: 'missing_object_id',
                message: 'Algolia response did not include an objectID'
            });
        }

        return {
            objectID: providerResponse.objectID,
            taskID: providerResponse.taskID,
            ...(providerResponse.createdAt !== undefined && { createdAt: providerResponse.createdAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
