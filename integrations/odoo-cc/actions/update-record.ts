import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    id: z.number().describe('Record ID to update. Example: 10'),
    fields: z.record(z.string(), z.unknown()).describe('Fields to update. Example: { "phone": "123-456-7890" }')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Update an Odoo model record.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedModel = encodeURIComponent(input.model);
        const encodedId = encodeURIComponent(String(input.id));

        // https://www.odoo.com/documentation/master/developer/reference/external_api.html
        const response = await nango.put({
            endpoint: `/1.0/${encodedModel}/${encodedId}`,
            data: input.fields,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format.',
                response: response.data
            });
        }

        return {
            success: providerResponse.data.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
