import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().describe('Name of the Algolia index to retrieve. Example: "algolia_movie_sample_dataset"')
});

const ProviderIndexSchema = z.object({
    name: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    entries: z.number().optional(),
    dataSize: z.number().optional(),
    fileSize: z.number().optional(),
    lastBuildTimeS: z.number().optional(),
    numberOfPendingTasks: z.number().optional(),
    pendingTask: z.boolean().optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderIndexSchema)
});

const OutputSchema = z.object({
    name: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    entries: z.number().optional(),
    dataSize: z.number().optional(),
    fileSize: z.number().optional(),
    lastBuildTimeS: z.number().optional(),
    numberOfPendingTasks: z.number().optional(),
    pendingTask: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve metadata for a single Algolia index.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-index',
        group: 'Indices'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.algolia.com/doc/rest-api/search/#list-indices
            endpoint: '/1/indexes',
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const index = listResponse.items.find((item) => item.name === input.indexName);

        if (!index) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Index "${input.indexName}" not found.`,
                indexName: input.indexName
            });
        }

        return {
            name: index.name,
            ...(index.createdAt !== undefined && { createdAt: index.createdAt }),
            ...(index.updatedAt !== undefined && { updatedAt: index.updatedAt }),
            ...(index.entries !== undefined && { entries: index.entries }),
            ...(index.dataSize !== undefined && { dataSize: index.dataSize }),
            ...(index.fileSize !== undefined && { fileSize: index.fileSize }),
            ...(index.lastBuildTimeS !== undefined && { lastBuildTimeS: index.lastBuildTimeS }),
            ...(index.numberOfPendingTasks !== undefined && { numberOfPendingTasks: index.numberOfPendingTasks }),
            ...(index.pendingTask !== undefined && { pendingTask: index.pendingTask })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
