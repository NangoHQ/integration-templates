import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization the team belongs to. Example: "nangodev".'),
        team_id_or_slug: z.string().describe('The ID or slug of the team whose members should be listed. Example: "nango-seed-team".'),
        cursor: z
            .string()
            .regex(/^\d+:-?\d+:[01]$/)
            .optional()
            .describe(
                'Pagination cursor from a previous response nextCursor field, in Sentry "position:offset:direction" format. Example: "100:1:0". Omit for the first page.'
            )
    })
    .describe('Parameters identifying the team whose members should be listed.');

const TeamMemberSchema = z
    .object({
        id: z.string().describe('Sentry organization member ID. Example: "15174593".'),
        email: z.string().describe('Email address of the member. Example: "api@nango.dev".'),
        name: z.string().describe('Display name of the member.'),
        orgRole: z.string().describe('Organization-level role of the member, e.g. "owner", "manager", "billing", or "member".'),
        teamRole: z.string().optional().describe('Team-level role of the member, e.g. "member" or "admin". Omitted when the member has no team-specific role.'),
        teamSlug: z.string().describe('Slug of the team the membership belongs to.'),
        pending: z.boolean().describe('Whether the membership invite is still pending acceptance.'),
        expired: z.boolean().describe('Whether the membership invite has expired.'),
        inviteStatus: z.string().describe('Invite status of the membership, e.g. "approved", "requested_to_be_invited", or "requested_to_join".'),
        inviterName: z.string().optional().describe('Name of the user who invited this member. Omitted when there is no inviter.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the organization membership was created. Example: "2021-07-06T21:13:01.120263Z".'),
        user: z
            .object({
                id: z.string().describe('Sentry user ID. Example: "280094367316".'),
                name: z.string().describe('Display name of the user.'),
                username: z.string().describe('Username of the user.'),
                email: z.string().describe('Email address of the user.'),
                avatarUrl: z.string().describe('URL of the user avatar image.'),
                isActive: z.boolean().describe('Whether the user account is active.'),
                lastLogin: z.string().optional().describe('ISO 8601 timestamp of the user last login. Omitted when the user has never logged in.'),
                lastActive: z.string().optional().describe('ISO 8601 timestamp of the user last activity. Omitted when the user has never been active.')
            })
            .nullable()
            .describe('The Sentry user account behind this membership, or null while the member is still an invited pending member with no account linked yet.')
    })
    .describe('A member of the team.');

const OutputSchema = z
    .object({
        members: z.array(TeamMemberSchema).describe('The members of the team.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A page of team members.');

const ProviderTeamMemberSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    orgRole: z.string(),
    teamRole: z.string().nullable(),
    teamSlug: z.string(),
    pending: z.boolean(),
    expired: z.boolean(),
    inviteStatus: z.string(),
    inviterName: z.string().nullable(),
    dateCreated: z.string(),
    user: z
        .object({
            id: z.string(),
            name: z.string(),
            username: z.string(),
            email: z.string(),
            avatarUrl: z.string(),
            isActive: z.boolean(),
            lastLogin: z.string().nullable(),
            lastActive: z.string().nullable()
        })
        .nullable()
});

function parseNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string' || linkHeader.length === 0) {
        return undefined;
    }
    const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'));
    if (!nextLink || !/results="true"/.test(nextLink)) {
        return undefined;
    }
    const cursorMatch = /cursor="([^"]+)"/.exec(nextLink);
    return cursorMatch ? cursorMatch[1] : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to read the members of a team without mutating any provider state.
 * @pitfalls: Members whose join request has not yet been approved (inviteStatus other than "approved") are excluded from the results. However, a member who has been invited by email and not yet signed up or accepted (pending: true) is included, with `user` set to null since no account is linked yet.
 */
const action = createAction({
    description: 'List the members of a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/teams/list-a-teams-members/
            endpoint: `/0/teams/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.team_id_or_slug)}/members/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerMembers = z.array(ProviderTeamMemberSchema).parse(response.data);

        const members = providerMembers.map((member) => ({
            id: member.id,
            email: member.email,
            name: member.name,
            orgRole: member.orgRole,
            ...(member.teamRole != null && { teamRole: member.teamRole }),
            teamSlug: member.teamSlug,
            pending: member.pending,
            expired: member.expired,
            inviteStatus: member.inviteStatus,
            ...(member.inviterName != null && { inviterName: member.inviterName }),
            dateCreated: member.dateCreated,
            user:
                member.user === null
                    ? null
                    : {
                          id: member.user.id,
                          name: member.user.name,
                          username: member.user.username,
                          email: member.user.email,
                          avatarUrl: member.user.avatarUrl,
                          isActive: member.user.isActive,
                          ...(member.user.lastLogin != null && { lastLogin: member.user.lastLogin }),
                          ...(member.user.lastActive != null && { lastActive: member.user.lastActive })
                      }
        }));

        const nextCursor = parseNextCursor(response.headers['link']);

        return {
            members,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
