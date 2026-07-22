import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    id: z.number().describe('Record ID to update. Example: 9'),
    vals: z.record(z.string(), z.unknown()).describe('Field values to write. Example: {"phone": "555-1234"}')
});

const OutputSchema = z.object({
    success: z.boolean(),
    model: z.string(),
    id: z.number()
});

const action = createAction({
    description: 'Update an Odoo model record',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `2/${encodeURIComponent(input.model)}/write`,
            data: {
                ids: [input.id],
                vals: input.vals
            },
            retries: 1
        });

        const success = z.boolean().safeParse(response.data);
        if (!success.success || success.data !== true) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Odoo write did not return true',
                model: input.model,
                id: input.id,
                response: response.data
            });
        }

        return {
            success: true,
            model: input.model,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
