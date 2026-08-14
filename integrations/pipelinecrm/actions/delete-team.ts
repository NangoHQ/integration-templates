import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.number().describe('Team ID. Example: 1429341')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/admin/teams/${encodeURIComponent(input.team_id)}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete team. Status: ${response.status}`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
