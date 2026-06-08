import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"')
});

const ProviderFieldSchema = z
    .object({
        string: z.string().optional(),
        type: z.string().optional(),
        required: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    model: z.string(),
    fields: z.record(z.string(), ProviderFieldSchema)
});

const action = createAction({
    description: 'Fetch Odoo fields metadata for a model',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-record-fields',
        group: 'Metadata'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: `/1.0/${encodeURIComponent(input.model)}/fields`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: `No fields found for model ${input.model}`
            });
        }

        const fields = z.record(z.string(), ProviderFieldSchema).parse(response.data);

        return {
            model: input.model,
            fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
