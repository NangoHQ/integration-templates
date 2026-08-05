import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().describe('The ID of the employee to unarchive. Example: "6a71de1392e09607f906db73"')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the unarchived employee')
});

const action = createAction({
    description: 'Restore a previously archived employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['employees:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://api.ingenious.build/reference/897c5ec5b7d92a4eefb3d1a78e9a5805
            endpoint: `/api/v2/pub/employees/${encodeURIComponent(input.employee_id)}/unarchive`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee not found',
                employee_id: input.employee_id
            });
        }

        return {
            id: input.employee_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
