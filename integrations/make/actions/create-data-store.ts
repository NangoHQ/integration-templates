import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the data store. Example: "My Data Store"'),
    teamId: z.number().describe('Team ID. Example: 2066772'),
    datastructureId: z.number().describe('Data structure ID. Example: 477315'),
    maxSizeMB: z.number().optional().describe('Maximum size in MB. Example: 1')
});

const ProviderDataStoreSchema = z.object({
    id: z.number(),
    name: z.string(),
    teamId: z.number(),
    datastructureId: z.number(),
    records: z.number(),
    size: z.string(),
    maxSize: z.string()
});

const ProviderResponseSchema = z.object({
    dataStore: ProviderDataStoreSchema
});

const OutputSchema = ProviderDataStoreSchema;

const action = createAction({
    description: 'Create a new data store',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.make.com/api-documentation/
            endpoint: '/data-stores',
            data: {
                name: input.name,
                teamId: input.teamId,
                datastructureId: input.datastructureId,
                ...(input.maxSizeMB !== undefined && { maxSizeMB: input.maxSizeMB })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        return parsed.dataStore;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
