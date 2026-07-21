import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().int().describe('User ID. Example: 1522999'),
    year: z.number().int().describe('Year. Example: 2026'),
    amount: z.number().describe('TOIL amount in days or hours. Example: 1.5'),
    description: z.string().optional().describe('Optional description for the TOIL entry. Example: "Overtime hours"')
});

const OutputSchema = z.object({
    id: z.number().int().describe('The new TOIL entry ID.')
});

const action = createAction({
    description: 'Add a Time Off In Lieu entry for a user for a year.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://timetastic.co.uk/api/
            endpoint: `/users/${encodeURIComponent(String(input.userId))}/allowances/${encodeURIComponent(String(input.year))}/toil`,
            data: {
                amount: input.amount,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const toilId = z.coerce.number().int().parse(response.data);

        return {
            id: toilId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
