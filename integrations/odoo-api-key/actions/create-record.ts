import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    vals_list: z.array(z.record(z.string(), z.unknown())).describe('List of value dictionaries to create records with. Example: [{"name": "Test Contact"}]')
});

const OutputSchema = z.object({
    ids: z.array(z.number()).describe('Array of newly created record IDs')
});

const action = createAction({
    description: 'Create an Odoo model record',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `2/${encodeURIComponent(input.model)}/create`,
            data: {
                vals_list: input.vals_list
            },
            retries: 3
        });

        const parsed = z.array(z.number()).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response was not an array of IDs',
                response: response.data
            });
        }

        return {
            ids: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
