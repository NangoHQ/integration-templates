import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('The unique identifier of the team. Example: "893075dd-2487-4122-925f-022c42e20265"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (@odata.nextLink). Omit for the first page.')
});

const ProviderChannelSchema = z.object({
    id: z.string(),
    createdDateTime: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    membershipType: z.string().nullable().optional(),
    layoutType: z.string().nullable().optional(),
    isArchived: z.boolean().nullable().optional(),
    isFavoriteByDefault: z.boolean().nullable().optional(),
    tenantId: z.string().nullable().optional()
});

const ChannelSchema = z.object({
    id: z.string(),
    createdDateTime: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    email: z.string().optional(),
    webUrl: z.string().optional(),
    membershipType: z.string().optional(),
    layoutType: z.string().optional(),
    isArchived: z.boolean().optional(),
    isFavoriteByDefault: z.boolean().optional(),
    tenantId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ChannelSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List channels in a team.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-channels',
        group: 'Channels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Channel.ReadBasic.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/channel-list
            endpoint: input.cursor || `/v1.0/teams/${input.teamId}/channels`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((item: unknown) => {
            const channel = ProviderChannelSchema.parse(item);
            return {
                id: channel.id,
                ...(channel.createdDateTime != null && { createdDateTime: channel.createdDateTime }),
                ...(channel.displayName != null && { displayName: channel.displayName }),
                ...(channel.description != null && { description: channel.description }),
                ...(channel.email != null && { email: channel.email }),
                ...(channel.webUrl != null && { webUrl: channel.webUrl }),
                ...(channel.membershipType != null && { membershipType: channel.membershipType }),
                ...(channel.layoutType != null && { layoutType: channel.layoutType }),
                ...(channel.isArchived != null && { isArchived: channel.isArchived }),
                ...(channel.isFavoriteByDefault != null && { isFavoriteByDefault: channel.isFavoriteByDefault }),
                ...(channel.tenantId != null && { tenantId: channel.tenantId })
            };
        });

        return {
            items,
            ...(providerResponse['@odata.nextLink'] != null && { nextCursor: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
