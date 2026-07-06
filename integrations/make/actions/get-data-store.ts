import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataStoreId: z.number().describe('The ID of the data store. Example: 141697')
});

const ProviderDataStoreSchema = z.object({
    id: z.number(),
    name: z.string(),
    records: z.coerce.number(),
    size: z.string(),
    maxSize: z.string(),
    teamId: z.coerce.number(),
    datastructureId: z.number()
});

const OutputSchema = z.object({
    dataStore: ProviderDataStoreSchema
});

const action = createAction({
    description: 'Retrieve details of a single data store.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/api-reference/data-stores/get-data-store
            endpoint: `/data-stores/${encodeURIComponent(String(input.dataStoreId))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Data store not found',
                dataStoreId: input.dataStoreId
            });
        }

        const parsed = z
            .object({
                dataStore: ProviderDataStoreSchema
            })
            .parse(response.data);

        return {
            dataStore: parsed.dataStore
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
