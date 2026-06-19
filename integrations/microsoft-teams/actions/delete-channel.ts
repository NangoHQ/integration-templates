import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('The unique identifier of the team. Example: "19:1234567890abcdef@thread.tacv2"'),
    channelId: z.string().describe('The unique identifier of the channel. Example: "19:abcdef1234567890@thread.tacv2"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    teamId: z.string(),
    channelId: z.string()
});

const action = createAction({
    description: 'Delete a channel from a team',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Channel.Delete.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/channel-delete
        await nango.delete({
            endpoint: `/v1.0/teams/${input.teamId}/channels/${input.channelId}`,
            retries: 1
        });

        return {
            success: true,
            teamId: input.teamId,
            channelId: input.channelId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
