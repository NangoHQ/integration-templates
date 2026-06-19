import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    id: z.number().describe('Record ID to delete. Example: 10')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean(),
    model: z.string(),
    id: z.number()
});

const action = createAction({
    description: 'Delete an Odoo model record.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedModel = encodeURIComponent(input.model);
        const encodedId = encodeURIComponent(String(input.id));

        const response = await nango.delete({
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: `/1.0/${encodedModel}/${encodedId}`,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.success,
            model: input.model,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
