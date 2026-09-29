import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization whose teams should be listed. Example: "nangodev".'),
        cursor: z
            .string()
            .regex(/^\d+:-?\d+:\d+$/)
            .optional()
            .describe('Pagination cursor returned as nextCursor by a previous call. Omit for the first page. Example: "100:1:0".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Maximum number of teams to return per page. Default and maximum allowed is 100.'),
        query: z.string().optional().describe('Filter teams by name or slug.')
    })
    .describe('Input for listing the teams of a Sentry organization.');

const SentryTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    dateCreated: z.string(),
    isMember: z.boolean(),
    teamRole: z.string().nullable(),
    hasAccess: z.boolean(),
    isPending: z.boolean(),
    memberCount: z.number(),
    access: z.array(z.string()),
    avatar: z.object({
        avatarType: z.string(),
        avatarUuid: z.string().nullable(),
        avatarUrl: z.string().nullable()
    }),
    projects: z
        .array(
            z.object({
                id: z.string(),
                slug: z.string(),
                name: z.string(),
                platform: z.string().nullable()
            })
        )
        .optional()
});

const TeamOutputSchema = z.object({
    id: z.string().describe('Unique numeric ID of the team. Example: "4512170111401984".'),
    slug: z.string().describe('URL-friendly unique slug of the team within the organization. Example: "nango-seed-team".'),
    name: z.string().describe('Display name of the team.'),
    dateCreated: z.string().describe('ISO 8601 timestamp of when the team was created.'),
    isMember: z.boolean().describe('Whether the acting user is a member of this team.'),
    teamRole: z.string().optional().describe('Organization-level role granted to the acting user on this team. Omitted when the user has no team role.'),
    hasAccess: z.boolean().describe('Whether the acting user has access to this team.'),
    isPending: z.boolean().describe('Whether the acting user has a pending membership invitation to this team.'),
    memberCount: z.number().describe('Number of organization members on this team.'),
    access: z
        .array(z.string())
        .describe(
            "Scopes the acting user's organization role grants on this team, e.g. team:read. Reflects the organization role, not the API token's scopes."
        ),
    avatar: z
        .object({
            avatarType: z.string().describe('Type of avatar, e.g. "letter_avatar" or "upload".'),
            avatarUuid: z.string().optional().describe('UUID of the uploaded avatar image. Omitted when no custom avatar is set.'),
            avatarUrl: z.string().optional().describe('URL of the avatar image. Omitted when no custom avatar is set.')
        })
        .describe('Avatar of the team.'),
    projects: z
        .array(
            z.object({
                id: z.string().describe('Unique numeric ID of the project.'),
                slug: z.string().describe('URL-friendly unique slug of the project within the organization.'),
                name: z.string().describe('Display name of the project.'),
                platform: z.string().optional().describe('Platform of the project, e.g. "node". Omitted when the project has no platform set.')
            })
        )
        .optional()
        .describe('Projects assigned to this team.')
});

const OutputSchema = z
    .object({
        teams: z.array(TeamOutputSchema).describe('Teams in the organization for the requested page.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more results.')
    })
    .describe('Result of listing the teams of a Sentry organization.');

function parseNextCursor(headers: Record<string, unknown>): string | undefined {
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== 'link' || typeof value !== 'string') {
            continue;
        }
        for (const part of value.split(',')) {
            if (!part.includes('rel="next"')) {
                continue;
            }
            if (part.includes('results="false"')) {
                return undefined;
            }
            const match = /cursor="([^"]+)"/.exec(part);
            const cursor = match?.[1];
            if (cursor !== undefined && cursor.length > 0) {
                return cursor;
            }
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only calls the Sentry list-teams endpoint, which reads organization teams without modifying anything.
 * @pitfalls: Sentry auto-creates a personal team (slug matching the organization slug) for the first organization member, so not every returned team was deliberately created. The access array in each team reflects the acting user's organization role, not the API token's scopes, so it cannot be used to predict which operations the token itself is allowed to perform.
 */
const action = createAction({
    description: 'List all teams in a Sentry organization',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/teams/list-an-organizations-teams/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/teams/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        };
        const response = await nango.get<unknown>(config);

        const teams = z.array(SentryTeamSchema).parse(response.data);
        const nextCursor = parseNextCursor(response.headers);

        return {
            teams: teams.map((team) => ({
                id: team.id,
                slug: team.slug,
                name: team.name,
                dateCreated: team.dateCreated,
                isMember: team.isMember,
                ...(team.teamRole != null && { teamRole: team.teamRole }),
                hasAccess: team.hasAccess,
                isPending: team.isPending,
                memberCount: team.memberCount,
                access: team.access,
                avatar: {
                    avatarType: team.avatar.avatarType,
                    ...(team.avatar.avatarUuid != null && { avatarUuid: team.avatar.avatarUuid }),
                    ...(team.avatar.avatarUrl != null && { avatarUrl: team.avatar.avatarUrl })
                },
                ...(team.projects !== undefined && {
                    projects: team.projects.map((project) => ({
                        id: project.id,
                        slug: project.slug,
                        name: project.name,
                        ...(project.platform != null && { platform: project.platform })
                    }))
                })
            })),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
