import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Team ID. Example: 244844')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a team in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:write'],
    endpoint: {
        method: 'POST',
        path: '/actions/delete-team'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.aircall.io/api-references/#delete-a-team
        const response = await nango.delete({
            endpoint: `/v1/teams/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete team',
                status: response.status
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
