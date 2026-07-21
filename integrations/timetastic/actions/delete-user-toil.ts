import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().describe('User ID. Example: 1522999'),
    year: z.number().describe('Year for the allowance. Example: 2026'),
    id: z.number().describe('TOIL entry ID. Example: 51015844')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a TOIL entry for a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://timetastic.co.uk/api/
            endpoint: `/users/${encodeURIComponent(input.userId)}/allowances/${encodeURIComponent(input.year)}/toil/${encodeURIComponent(input.id)}`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `TOIL entry ${input.id} not found for user ${input.userId} in year ${input.year}`
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to delete TOIL entry: ${response.status}`
            });
        }

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
