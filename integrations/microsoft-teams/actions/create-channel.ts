import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('The ID of the team to create the channel in. Example: "19:xxxxxxxxxxxx"'),
    displayName: z.string().describe('The display name of the channel. Example: "General"'),
    description: z.string().optional().describe('The description of the channel.'),
    membershipType: z.enum(['standard', 'private', 'shared', 'unknownFutureValue']).optional().describe('The type of the channel. Defaults to standard.')
});

const ProviderChannelSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    description: z.string().nullable().optional(),
    membershipType: z.string().optional(),
    createdDateTime: z.string().optional(),
    webUrl: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    description: z.string().optional(),
    membershipType: z.string().optional(),
    createdDateTime: z.string().optional(),
    webUrl: z.string().optional()
});

const action = createAction({
    description: 'Create a channel in a team.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Channel.Create', 'Group.ReadWrite.All', 'Team.ReadBasic.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config = {
            // https://learn.microsoft.com/graph/api/team-post-channels
            endpoint: `/v1.0/teams/${input.teamId}/channels`,
            data: {
                displayName: input.displayName,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.membershipType !== undefined && { membershipType: input.membershipType })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerChannel = ProviderChannelSchema.parse(response.data);

        return {
            id: providerChannel.id,
            displayName: providerChannel.displayName,
            ...(providerChannel.description != null && { description: providerChannel.description }),
            ...(providerChannel.membershipType != null && { membershipType: providerChannel.membershipType }),
            ...(providerChannel.createdDateTime != null && { createdDateTime: providerChannel.createdDateTime }),
            ...(providerChannel.webUrl != null && { webUrl: providerChannel.webUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
