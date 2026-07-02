import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataStoreId: z.number().describe('The ID of the data store. Example: 141641'),
    dataStoreKeyRecord: z.string().describe('The key of the data store record. Example: seed-record-1'),
    data: z.record(z.string(), z.unknown()).describe('Partial data object to update. Unspecified fields are left unchanged.')
});

const ProviderResponseSchema = z.object({
    key: z.string(),
    data: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    key: z.string(),
    data: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: 'Update a single record in a data store.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/api-reference/data-stores/data/patch--data-stores--datastoreid--data--datastorekeyrecord-.md
        const response = await nango.patch({
            endpoint: `/data-stores/${encodeURIComponent(input.dataStoreId)}/data/${encodeURIComponent(input.dataStoreKeyRecord)}`,
            data: input.data,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Data store record not found or update failed.',
                dataStoreId: input.dataStoreId,
                dataStoreKeyRecord: input.dataStoreKeyRecord
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            key: providerData.key,
            data: providerData.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
