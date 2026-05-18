import { createSync } from 'nango';
import { z } from 'zod';

const ChannelSchema = z.object({
    id: z.string(),
    teamId: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    membershipType: z.string().optional(),
    createdDateTime: z.string().optional(),
    isArchived: z.boolean().optional(),
    webUrl: z.string().optional(),
    email: z.string().optional()
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional()
});

const ProviderTeamsResponseSchema = z.object({
    value: z.array(ProviderTeamSchema),
    '@odata.nextLink': z.string().optional()
});

const ProviderChannelSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    membershipType: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    isArchived: z.boolean().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const ProviderChannelsResponseSchema = z.object({
    value: z.array(ProviderChannelSchema),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    teamsPageEndpoint: z.string(),
    teamIndex: z.number().int().min(-1),
    channelsNextLink: z.string()
});

const sync = createSync({
    description: 'Sync channels for selected teams.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    checkpoint: CheckpointSchema,

    // https://learn.microsoft.com/graph/api/channel-list
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/team-channels'
        }
    ],

    scopes: ['Channel.ReadBasic.All', 'Team.ReadBasic.All'],

    models: {
        Channel: ChannelSchema
    },

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointResult);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { teamsPageEndpoint: '', teamIndex: -1, channelsNextLink: '' };

        await nango.trackDeletesStart('Channel');

        let teamsPageEndpoint = checkpoint.teamsPageEndpoint || '/v1.0/me/joinedTeams';

        while (teamsPageEndpoint) {
            // https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
            const teamsResponse = await nango.get({
                endpoint: teamsPageEndpoint,
                retries: 3
            });

            const parsedTeams = ProviderTeamsResponseSchema.parse(teamsResponse.data);
            const teams = parsedTeams.value;
            const isResumePage = checkpoint.teamsPageEndpoint === teamsPageEndpoint;
            const startTeamIndex = isResumePage && checkpoint.teamIndex >= 0 && checkpoint.teamIndex < teams.length ? checkpoint.teamIndex : 0;

            for (let teamIndex = startTeamIndex; teamIndex < teams.length; teamIndex += 1) {
                const team = teams[teamIndex]!;
                let channelsNextLink: string | undefined =
                    isResumePage && teamIndex === startTeamIndex && checkpoint.channelsNextLink.length > 0 ? checkpoint.channelsNextLink : undefined;

                do {
                    // https://learn.microsoft.com/en-us/graph/api/channel-list
                    const channelsResponse = await nango.get({
                        endpoint: channelsNextLink || `/v1.0/teams/${team.id}/channels`,
                        retries: 3
                    });

                    const parsedChannels = ProviderChannelsResponseSchema.parse(channelsResponse.data);

                    const channels: Array<z.infer<typeof ChannelSchema>> = [];
                    for (const c of parsedChannels.value) {
                        channels.push({
                            id: c.id,
                            teamId: team.id,
                            ...(c.displayName != null && { displayName: c.displayName }),
                            ...(c.description != null && { description: c.description }),
                            ...(c.membershipType != null && { membershipType: c.membershipType }),
                            ...(c.createdDateTime != null && { createdDateTime: c.createdDateTime }),
                            ...(c.isArchived != null && { isArchived: c.isArchived }),
                            ...(c.webUrl != null && { webUrl: c.webUrl }),
                            ...(c.email != null && { email: c.email })
                        });
                    }

                    if (channels.length > 0) {
                        await nango.batchSave(channels, 'Channel');
                    }

                    channelsNextLink = parsedChannels['@odata.nextLink'];

                    if (channelsNextLink) {
                        await nango.saveCheckpoint({ teamsPageEndpoint, teamIndex, channelsNextLink });
                    } else if (teamIndex < teams.length - 1) {
                        await nango.saveCheckpoint({ teamsPageEndpoint, teamIndex: teamIndex + 1, channelsNextLink: '' });
                    } else if (parsedTeams['@odata.nextLink']) {
                        await nango.saveCheckpoint({ teamsPageEndpoint: parsedTeams['@odata.nextLink'], teamIndex: 0, channelsNextLink: '' });
                    }
                } while (channelsNextLink);
            }

            teamsPageEndpoint = parsedTeams['@odata.nextLink'] || '';
        }

        await nango.saveCheckpoint({ teamsPageEndpoint: '', teamIndex: -1, channelsNextLink: '' });
        await nango.trackDeletesEnd('Channel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
