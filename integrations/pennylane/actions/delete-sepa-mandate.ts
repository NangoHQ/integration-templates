import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('SEPA mandate ID. Example: "8323891200"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a SEPA mandate.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://pennylane.readme.io/reference/deletesepamandate
            endpoint: `/api/external/v2/sepa_mandates/${encodeURIComponent(input.id)}`,
            retries: 10
        });

        return {
            id: input.id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
