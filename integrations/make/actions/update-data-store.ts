import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataStoreId: z.number().describe('The ID of the data store. Example: 141696'),
    name: z.string().optional().describe('The data store name. The name must be at most 128 characters long and does not need to be unique.'),
    datastructureId: z.number().optional().describe('The unique ID of the data structure included in the data store.'),
    maxSizeMB: z.number().optional().describe('The maximum size of the data store (defined in MB).')
});

const ProviderDataStoreSchema = z.object({
    id: z.number(),
    name: z.string(),
    records: z.number(),
    size: z.string(),
    maxSize: z.string(),
    teamId: z.number(),
    datastructureId: z.number().nullable()
});

const PatchResponseSchema = z.object({
    dataStore: ProviderDataStoreSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    records: z.number(),
    size: z.string(),
    maxSize: z.string(),
    teamId: z.number(),
    datastructureId: z.number().optional()
});

const action = createAction({
    description: "Update a data store's name, structure, or size limit.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.datastructureId !== undefined) {
            body['datastructureId'] = input.datastructureId;
        }
        if (input.maxSizeMB !== undefined) {
            body['maxSizeMB'] = input.maxSizeMB;
        }

        // https://developers.make.com/api-documentation/api-reference/data-stores/patch--data-stores--datastoreid
        const response = await nango.patch({
            endpoint: `/data-stores/${encodeURIComponent(String(input.dataStoreId))}`,
            data: body,
            retries: 1
        });

        const parsed = PatchResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from the Make API.'
            });
        }

        const dataStore = parsed.data.dataStore;

        return {
            id: dataStore.id,
            name: dataStore.name,
            records: dataStore.records,
            size: dataStore.size,
            maxSize: dataStore.maxSize,
            teamId: dataStore.teamId,
            ...(dataStore.datastructureId != null && { datastructureId: dataStore.datastructureId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
