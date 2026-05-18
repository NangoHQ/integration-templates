import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('The unique identifier of the team. Example: "893075dd-2487-4122-925f-022c42e20265"'),
    channelId: z.string().describe('The unique identifier of the channel. Example: "19:561fbdbbfca848a484f0a6f00ce9dbbd@thread.tacv2"')
});

const ProviderChannelSchema = z.object({
    id: z.string(),
    createdDateTime: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    isArchived: z.boolean().optional().nullable(),
    isFavoriteByDefault: z.boolean().optional().nullable(),
    layoutType: z.string().optional().nullable(),
    membershipType: z.string().optional().nullable(),
    tenantId: z.string().optional().nullable(),
    webUrl: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    createdDateTime: z.string().optional(),
    description: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    isArchived: z.boolean().optional(),
    isFavoriteByDefault: z.boolean().optional(),
    layoutType: z.string().optional(),
    membershipType: z.string().optional(),
    tenantId: z.string().optional(),
    webUrl: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a channel by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-channel',
        group: 'Channels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Channel.ReadBasic.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/channel-get
        const response = await nango.get({
            endpoint: `/v1.0/teams/${input.teamId}/channels/${input.channelId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Channel not found',
                teamId: input.teamId,
                channelId: input.channelId
            });
        }

        const providerChannel = ProviderChannelSchema.parse(response.data);

        return {
            id: providerChannel.id,
            ...(providerChannel.createdDateTime != null && { createdDateTime: providerChannel.createdDateTime }),
            ...(providerChannel.description != null && { description: providerChannel.description }),
            ...(providerChannel.displayName != null && { displayName: providerChannel.displayName }),
            ...(providerChannel.email != null && { email: providerChannel.email }),
            ...(providerChannel.isArchived != null && { isArchived: providerChannel.isArchived }),
            ...(providerChannel.isFavoriteByDefault != null && { isFavoriteByDefault: providerChannel.isFavoriteByDefault }),
            ...(providerChannel.layoutType != null && { layoutType: providerChannel.layoutType }),
            ...(providerChannel.membershipType != null && { membershipType: providerChannel.membershipType }),
            ...(providerChannel.tenantId != null && { tenantId: providerChannel.tenantId }),
            ...(providerChannel.webUrl != null && { webUrl: providerChannel.webUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
