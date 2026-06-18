import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    values: z.record(z.string(), z.unknown()).describe('Field values for the new record')
});

const ProviderResponseSchema = z.object({
    id: z.number().int()
});

const OutputSchema = z.object({
    id: z.number().int()
});

const action = createAction({
    description: 'Create an Odoo model record.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: `/1.0/${encodeURIComponent(input.model)}`,
            data: input.values,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
