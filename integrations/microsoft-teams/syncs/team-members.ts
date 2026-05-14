import { createSync } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/graph/api/team-list-members
const TeamMemberSchema = z.object({
    id: z.string(),
    teamId: z.string(),
    userId: z.string(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    roles: z.array(z.string())
});

// https://learn.microsoft.com/en-us/graph/api/resources/aaduserconversationmember
const AadUserConversationMemberSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()).optional(),
    displayName: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

// https://learn.microsoft.com/en-us/graph/api/resources/team
const TeamSchema = z.object({
    id: z.string()
});

const TeamsResponseSchema = z.object({
    value: z.array(TeamSchema),
    '@odata.nextLink': z.string().optional()
});

const TeamMembersResponseSchema = z.object({
    value: z.array(AadUserConversationMemberSchema),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    teamsPageEndpoint: z.string(),
    teamIndex: z.number().int().min(-1),
    membersNextLink: z.string()
});

const sync = createSync({
    description: 'Sync team membership rosters',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        TeamMember: TeamMemberSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/team-members'
        }
    ],

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointResult);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { teamsPageEndpoint: '', teamIndex: -1, membersNextLink: '' };

        // Full refresh required: Microsoft Graph team members API does not support
        // modified_since filtering, delta endpoints, or change tracking. The only
        // way to get current membership state is to list all members per team.
        await nango.trackDeletesStart('TeamMember');

        let teamsPageEndpoint = checkpoint.teamsPageEndpoint || '/v1.0/me/joinedTeams';

        while (teamsPageEndpoint) {
            // https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
            const teamsResponse = await nango.get({
                endpoint: teamsPageEndpoint,
                retries: 3
            });

            const parsedTeams = TeamsResponseSchema.parse(teamsResponse.data);
            const teams = parsedTeams.value;
            const isResumePage = checkpoint.teamsPageEndpoint === teamsPageEndpoint;
            const startTeamIndex = isResumePage && checkpoint.teamIndex >= 0 && checkpoint.teamIndex < teams.length ? checkpoint.teamIndex : 0;

            for (let teamIndex = startTeamIndex; teamIndex < teams.length; teamIndex += 1) {
                const team = teams[teamIndex]!;
                let membersNextLink: string | undefined =
                    isResumePage && teamIndex === startTeamIndex && checkpoint.membersNextLink.length > 0 ? checkpoint.membersNextLink : undefined;

                do {
                    // https://learn.microsoft.com/en-us/graph/api/team-list-members
                    const membersResponse = await nango.get({
                        endpoint: membersNextLink || `/v1.0/teams/${team.id}/members?$top=100`,
                        retries: 3
                    });

                    const parsedMembers = TeamMembersResponseSchema.parse(membersResponse.data);
                    const members = parsedMembers.value
                        .filter((member) => member.userId)
                        .map((member) => ({
                            id: `${team.id}_${member.userId}`,
                            teamId: team.id,
                            userId: member.userId!,
                            ...(member.displayName != null && { displayName: member.displayName }),
                            ...(member.email != null && { email: member.email }),
                            roles: member.roles ?? []
                        }));

                    if (members.length > 0) {
                        await nango.batchSave(members, 'TeamMember');
                    }

                    membersNextLink = parsedMembers['@odata.nextLink'];

                    if (membersNextLink) {
                        await nango.saveCheckpoint({ teamsPageEndpoint, teamIndex, membersNextLink });
                    } else if (teamIndex < teams.length - 1) {
                        await nango.saveCheckpoint({ teamsPageEndpoint, teamIndex: teamIndex + 1, membersNextLink: '' });
                    } else if (parsedTeams['@odata.nextLink']) {
                        await nango.saveCheckpoint({ teamsPageEndpoint: parsedTeams['@odata.nextLink'], teamIndex: 0, membersNextLink: '' });
                    }
                } while (membersNextLink);
            }

            teamsPageEndpoint = parsedTeams['@odata.nextLink'] || '';
        }

        await nango.saveCheckpoint({ teamsPageEndpoint: '', teamIndex: -1, membersNextLink: '' });
        await nango.trackDeletesEnd('TeamMember');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
