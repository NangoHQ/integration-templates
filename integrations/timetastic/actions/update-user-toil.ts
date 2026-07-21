import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().describe('User ID. Example: 1522999'),
    year: z.number().describe('Year. Example: 2026'),
    id: z.number().describe('TOIL entry ID. Example: 51015765'),
    amount: z.number().describe('TOIL amount in days. Example: 2.0'),
    description: z.string().optional().describe('Optional description for the TOIL entry.')
});

const OutputSchema = z.object({
    id: z.number().describe('The updated TOIL entry ID.')
});

const action = createAction({
    description: 'Update an existing TOIL entry for a user for a year.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
            endpoint: `/users/${encodeURIComponent(String(input.userId))}/allowances/${encodeURIComponent(String(input.year))}/toil/${encodeURIComponent(String(input.id))}`,
            data: {
                amount: input.amount,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const toilId = z.number().parse(response.data);

        return {
            id: toilId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
