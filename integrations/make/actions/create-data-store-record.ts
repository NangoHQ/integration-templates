import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataStoreId: z.number().describe('Data store ID. Example: 141641'),
    key: z.string().optional().describe('Optional record key. Auto-generated if omitted.'),
    data: z.record(z.string(), z.unknown()).describe('Record data matching the data store structure spec.')
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
    description: 'Create a new record in a data store.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.make.com/api-documentation/
            endpoint: `/data-stores/${encodeURIComponent(input.dataStoreId)}/data`,
            data: {
                ...(input.key !== undefined && { key: input.key }),
                data: input.data
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            key: providerResponse.key,
            data: providerResponse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
