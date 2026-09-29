import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the team belongs to. Example: "nangodev" or "4512170041409536"'),
        team_id_or_slug: z.string().describe('The ID or slug of the team to retrieve. Example: "nango-seed-team" or "4512170111401984"')
    })
    .describe('Path identifiers of the Sentry team to retrieve');

const ProviderTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    dateCreated: z.string().nullable(),
    isMember: z.boolean(),
    teamRole: z.string().nullable(),
    flags: z.object({
        'idp:provisioned': z.boolean()
    }),
    access: z.array(z.string()),
    hasAccess: z.boolean(),
    isPending: z.boolean(),
    memberCount: z.number(),
    avatar: z.object({
        avatarType: z.string(),
        avatarUuid: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional()
    })
});

const OutputSchema = z
    .object({
        id: z.string().describe('The numeric ID of the team, as a string. Example: "4512170111401984"'),
        slug: z.string().describe('The URL-friendly slug of the team. Example: "nango-seed-team"'),
        name: z.string().describe('The display name of the team.'),
        dateCreated: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of when the team was created. Omitted when Sentry returns null. Example: "2026-09-29T14:26:48.828608Z"'),
        isMember: z.boolean().describe('Whether the member the token acts as is on the team.'),
        teamRole: z
            .string()
            .optional()
            .describe('The role the acting member has on the team, e.g. "admin" or "contributor". Omitted when the member has no team-level role.'),
        flags: z
            .object({
                'idp:provisioned': z.boolean().describe('Whether the team is provisioned and managed by an external identity provider.')
            })
            .describe('Provisioning flags for the team.'),
        access: z.array(z.string()).describe('Permission scopes the acting member has on the team, based on their organization role.'),
        hasAccess: z.boolean().describe('Whether the acting member has access to the team.'),
        isPending: z.boolean().describe("Whether the acting member's membership on the team is pending approval."),
        memberCount: z.number().describe('Number of organization members on the team.'),
        avatar: z
            .object({
                avatarType: z.string().describe('The type of avatar, e.g. "letter_avatar", "upload" or "gravatar".'),
                avatarUuid: z.string().optional().describe('The UUID of the uploaded avatar image. Omitted when the team has no uploaded avatar.'),
                avatarUrl: z.string().optional().describe('The URL of the avatar image. Omitted when the team has no hosted avatar image.')
            })
            .describe('The avatar of the team.')
    })
    .describe('Details of a single Sentry team');

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET request for a team's details and makes no provider mutations.
 * @pitfalls: The `access` array reflects the acting user's organization-role UI permissions, not the scopes actually granted to the API token, so it can list permissions the token cannot exercise.
 */
const action = createAction({
    description: "Retrieve a single team's details.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/teams/retrieve-a-team/
        const response = await nango.get({
            endpoint: `/0/teams/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.team_id_or_slug)}/`,
            retries: 3
        });

        const team = ProviderTeamSchema.parse(response.data);

        return {
            id: team.id,
            slug: team.slug,
            name: team.name,
            ...(team.dateCreated != null && { dateCreated: team.dateCreated }),
            isMember: team.isMember,
            ...(team.teamRole != null && { teamRole: team.teamRole }),
            flags: {
                'idp:provisioned': team.flags['idp:provisioned']
            },
            access: team.access,
            hasAccess: team.hasAccess,
            isPending: team.isPending,
            memberCount: team.memberCount,
            avatar: {
                avatarType: team.avatar.avatarType,
                ...(team.avatar.avatarUuid != null && { avatarUuid: team.avatar.avatarUuid }),
                ...(team.avatar.avatarUrl != null && { avatarUrl: team.avatar.avatarUrl })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
