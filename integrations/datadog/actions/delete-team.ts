import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('The ID of the team to delete. Example: "785d215c-9831-4702-8108-ff3b2db500c9"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    teamId: z.string()
});

const action = createAction({
    description: 'Delete a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams_read', 'teams_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/teams/#delete-a-team
        await nango.delete({
            endpoint: `v2/team/${encodeURIComponent(input.teamId)}`,
            retries: 3
        });

        return {
            success: true,
            teamId: input.teamId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
