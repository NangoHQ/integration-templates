import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().int().describe('The id of the user to update. Example: 1522999'),
    year: z.number().int().describe('The year to update the allowance for. Example: 2026'),
    amount: z.number().describe('The new allowance amount. Example: 25')
});

const OutputSchema = z.object({
    userId: z.number().int(),
    year: z.number().int(),
    amount: z.number()
});

const action = createAction({
    description: "Update a user's annual leave allowance for a year.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
        await nango.put({
            // https://timetastic.co.uk/api/
            endpoint: `/users/${encodeURIComponent(String(input.userId))}/allowances/${encodeURIComponent(String(input.year))}/allowance`,
            data: {
                amount: input.amount
            },
            retries: 3
        });

        return {
            userId: input.userId,
            year: input.year,
            amount: input.amount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
