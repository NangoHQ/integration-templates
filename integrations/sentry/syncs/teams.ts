import { createSync } from 'nango';
import { z } from 'zod';

const TeamAvatarSchema = z
    .object({
        avatarType: z.string().optional().describe('Type of avatar configured for the team, e.g. "letter_avatar" or "upload".'),
        avatarUuid: z.string().optional().describe('Sentry UUID of the uploaded avatar image. Omitted when Sentry returns null.'),
        avatarUrl: z.string().optional().describe('Absolute URL of the team avatar image. Omitted when Sentry returns null.')
    })
    .describe('Avatar information for the team.');

const TeamSchema = z
    .object({
        id: z.string().describe('Unique Sentry team ID (numeric string), e.g. "4512170111401984".'),
        slug: z.string().describe('URL-friendly team slug, unique within the organization, e.g. "nango-seed-team".'),
        name: z.string().describe('Human-readable name of the team.'),
        dateCreated: z.string().optional().describe('ISO 8601 timestamp of when the team was created. Omitted when Sentry returns null.'),
        isMember: z.boolean().describe('Whether the member associated with the API token belongs to this team.'),
        teamRole: z.string().optional().describe('Organization-level role granted to members of this team, e.g. "admin". Omitted when Sentry returns null.'),
        hasAccess: z.boolean().describe('Whether the API token owner has access to this team.'),
        isPending: z.boolean().describe('Whether membership of the API token owner in this team is pending approval.'),
        memberCount: z.number().describe('Number of organization members on this team.'),
        access: z.array(z.string()).describe('OAuth-style scopes the API token owner has on this team, e.g. "team:read".'),
        avatar: TeamAvatarSchema.optional().describe('Avatar information for the team. Omitted when Sentry does not return avatar data.')
    })
    .describe('A Sentry team belonging to the organization.');

// Internal schemas used only to parse Sentry API responses.
const SentryTeamAvatarSchema = z.object({
    avatarType: z.string().optional(),
    avatarUuid: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional()
});

const SentryTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    dateCreated: z.string().nullable(),
    isMember: z.boolean(),
    teamRole: z.string().nullable(),
    access: z.array(z.string()),
    hasAccess: z.boolean(),
    isPending: z.boolean(),
    memberCount: z.number(),
    avatar: SentryTeamAvatarSchema
});

const SentryOrganizationSchema = z.object({
    id: z.string(),
    slug: z.string()
});

function getResponseHeader(headers: Record<string, unknown>, name: string): string | undefined {
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === name) {
            return typeof value === 'string' ? value : undefined;
        }
    }
    return undefined;
}

function nextCursorFromLinkHeader(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    for (const part of linkHeader.split(',')) {
        if (!/rel="next"/.test(part)) {
            continue;
        }
        // Sentry always emits a rel="next" link, even on the last page, so the
        // results attribute is the authoritative signal that another page exists.
        if (!/results="true"/.test(part)) {
            return undefined;
        }
        const cursorMatch = /cursor="([^"]+)"/.exec(part);
        return cursorMatch?.[1];
    }
    return undefined;
}

function toTeam(team: z.infer<typeof SentryTeamSchema>): z.infer<typeof TeamSchema> {
    return {
        id: team.id,
        slug: team.slug,
        name: team.name,
        isMember: team.isMember,
        hasAccess: team.hasAccess,
        isPending: team.isPending,
        memberCount: team.memberCount,
        access: team.access,
        ...(team.dateCreated !== null && { dateCreated: team.dateCreated }),
        ...(team.teamRole !== null && { teamRole: team.teamRole }),
        ...(team.avatar !== undefined && {
            avatar: {
                ...(team.avatar.avatarType !== undefined && { avatarType: team.avatar.avatarType }),
                ...(team.avatar.avatarUuid != null && { avatarUuid: team.avatar.avatarUuid }),
                ...(team.avatar.avatarUrl != null && { avatarUrl: team.avatar.avatarUrl })
            }
        })
    };
}

const sync = createSync({
    description: 'Sync all teams in the Sentry organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['team:read'],
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        // The teams endpoint has no modified-since filter (only cursor pagination), so
        // this is a full refresh guarded by trackDeletesStart()/trackDeletesEnd().
        // Delete-tracked full refreshes always start from the first page: no cursor is
        // restored from a checkpoint and no checkpoint is persisted mid-scan.

        // https://docs.sentry.io/api/users/list-your-organizations/
        const organizationsResponse = await nango.get<unknown>({
            endpoint: '/0/organizations/',
            retries: 3
        });
        const organizations = z.array(SentryOrganizationSchema).parse(organizationsResponse.data);
        const organization = organizations[0];
        if (!organization) {
            throw new Error('No Sentry organization is accessible with this connection');
        }

        await nango.trackDeletesStart('Team');

        let total = 0;
        let cursor: string | undefined = undefined;
        do {
            // https://docs.sentry.io/api/teams/list-an-organizations-teams/
            const response = await nango.get<unknown>({
                endpoint: `/0/organizations/${encodeURIComponent(organization.slug)}/teams/`,
                params: {
                    per_page: 100,
                    ...(cursor !== undefined && { cursor })
                },
                retries: 3
            });
            // Throw on parse failure: skipping a record inside a delete-tracked scan
            // would falsely mark it as deleted at trackDeletesEnd().
            const teams = z.array(SentryTeamSchema).parse(response.data);
            if (teams.length > 0) {
                await nango.batchSave(teams.map(toTeam), 'Team');
                total += teams.length;
            }
            const nextCursor = nextCursorFromLinkHeader(getResponseHeader(response.headers, 'link'));
            // Guard against a repeated cursor, which would otherwise loop forever.
            cursor = nextCursor !== undefined && nextCursor !== cursor ? nextCursor : undefined;
        } while (cursor !== undefined);

        await nango.trackDeletesEnd('Team');
        await nango.log(`Synced ${total} team(s) from organization ${organization.slug}`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
