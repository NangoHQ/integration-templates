import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().describe('The id of the user to update. Example: 1523007'),
    year: z.number().describe('The year to update the carry forward for. Example: 2026'),
    amount: z.number().describe('The carry forward amount. Example: 3')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Update a user's carried-forward allowance for a year.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['allowances:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://timetastic.co.uk/api/
            endpoint: `/users/${encodeURIComponent(String(input.userId))}/allowances/${encodeURIComponent(String(input.year))}/carryforward`,
            data: {
                amount: input.amount
            },
            retries: 1
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Unexpected status code: ${response.status}`
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
