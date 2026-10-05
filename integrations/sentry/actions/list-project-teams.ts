import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "nangodev".'),
        project_id_or_slug: z
            .string()
            .describe('The ID or slug of the project. Project slugs are unique within each organization. Example: "nango-seed-project".'),
        cursor: z.string().optional().describe('Pagination cursor returned as nextCursor by a previous call. Omit for the first page.')
    })
    .describe('Input for listing the teams a Sentry project is assigned to.');

const TeamAvatarSchema = z.object({
    avatarType: z.string().optional().describe('Avatar kind, e.g. "letter_avatar" or "upload".'),
    avatarUuid: z.string().optional().describe('UUID of the uploaded avatar image. Omitted when not set.'),
    avatarUrl: z.string().optional().describe('URL of the avatar image. Omitted when not set.')
});

const TeamSchema = z.object({
    id: z.string().describe('Sentry numeric team ID, as a string. Example: "4502349234123".'),
    slug: z.string().describe('URL-friendly team slug, unique within the organization. Example: "ancient-gabelers".'),
    name: z.string().describe('Human-readable team name. Example: "Ancient Gabelers".'),
    dateCreated: z.string().optional().describe('ISO 8601 timestamp of when the team was created. Omitted when Sentry returns null.'),
    isMember: z.boolean().describe('Whether the acting user is a member of the team.'),
    teamRole: z.string().optional().describe('The acting user\'s role within the team, e.g. "contributor" or "admin". Omitted when the user has no team role.'),
    flags: z.record(z.string(), z.unknown()).describe('Team feature flags keyed by flag name, e.g. { "idp:provisioned": false }.'),
    access: z.array(z.string()).describe('Scopes the acting user\'s organization role grants on the team, e.g. "team:read".'),
    hasAccess: z.boolean().describe('Whether the acting user has access to the team.'),
    isPending: z.boolean().describe("Whether the acting user's membership in the team is pending approval."),
    memberCount: z.number().int().describe('Number of organization members on the team.'),
    avatar: TeamAvatarSchema.describe('Team avatar details.')
});

const OutputSchema = z
    .object({
        teams: z.array(TeamSchema).describe('Teams that have access to the project.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more results.')
    })
    .describe('Teams assigned to the project, plus the cursor for the next page when more results exist.');

const ProviderTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    dateCreated: z.string().nullable(),
    isMember: z.boolean(),
    teamRole: z.string().nullable(),
    flags: z.record(z.string(), z.unknown()),
    access: z.array(z.string()),
    hasAccess: z.boolean(),
    isPending: z.boolean(),
    memberCount: z.number(),
    avatar: z.object({
        avatarType: z.string().optional(),
        avatarUuid: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional()
    })
});

function parseNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    for (const part of linkHeader.split(',')) {
        if (!part.includes('rel="next"')) {
            continue;
        }
        const resultsMatch = /results="(true|false)"/.exec(part);
        const cursorMatch = /cursor="([^"]+)"/.exec(part);
        if (resultsMatch?.[1] === 'true' && cursorMatch?.[1]) {
            return cursorMatch[1];
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only performs a provider read (GET) to list the teams assigned to a project; it does not modify any Sentry resource.
 * @pitfalls: The access array on each team reflects the acting user's organization-role UI permissions, not the API token's granted scopes, so it is not a reliable predictor of what the token can call. Results can be stale: identical calls minutes apart were observed to disagree (an empty list, then the assigned team) with no changes in between.
 */
const action = createAction({
    description: 'List the teams a project is assigned to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/teams/list-a-projects-teams/
        const response = await nango.get({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/teams/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerTeams = z.array(ProviderTeamSchema).parse(response.data);

        const teams: z.infer<typeof TeamSchema>[] = providerTeams.map((team) => ({
            id: team.id,
            slug: team.slug,
            name: team.name,
            ...(team.dateCreated !== null && { dateCreated: team.dateCreated }),
            isMember: team.isMember,
            ...(team.teamRole !== null && { teamRole: team.teamRole }),
            flags: team.flags,
            access: team.access,
            hasAccess: team.hasAccess,
            isPending: team.isPending,
            memberCount: team.memberCount,
            avatar: {
                ...(team.avatar.avatarType !== undefined && { avatarType: team.avatar.avatarType }),
                ...(team.avatar.avatarUuid != null && { avatarUuid: team.avatar.avatarUuid }),
                ...(team.avatar.avatarUrl != null && { avatarUrl: team.avatar.avatarUrl })
            }
        }));

        const rawLink = response.headers['link'];
        const linkHeader = typeof rawLink === 'string' ? rawLink : Array.isArray(rawLink) ? rawLink.join(',') : undefined;
        const nextCursor = parseNextCursor(linkHeader);

        return {
            teams,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
