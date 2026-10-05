import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the team belongs to. Example: "nangodev".'),
        team_id_or_slug: z.string().describe('The ID or current slug of the team to update. Example: "nango-seed-team".'),
        slug: z
            .string()
            .max(50)
            .regex(/^(?![0-9]+$)[a-z0-9_-]+$/)
            .optional()
            .describe(
                'New slug for the team. Must be unique within the organization and use only lowercase letters, digits, hyphens, and underscores, and not consist solely of digits. Example: "backend-team".'
            ),
        name: z.string().max(64).optional().describe('New display name for the team. Example: "Backend Team".')
    })
    .describe(
        'Input for updating a team. Path keys identify the team; slug and name are the updatable attributes, and omitting both leaves the team unchanged.'
    );

const TeamAvatarSchema = z.object({
    avatarType: z.string(),
    avatarUuid: z.string().nullable(),
    avatarUrl: z.string().nullable()
});

const TeamResponseSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    dateCreated: z.string().nullable(),
    isMember: z.boolean(),
    teamRole: z.string().nullable(),
    flags: z.object({
        'idp:provisioned': z.boolean().optional()
    }),
    access: z.array(z.string()),
    hasAccess: z.boolean(),
    isPending: z.boolean(),
    memberCount: z.number(),
    avatar: TeamAvatarSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('Numeric ID of the team. Example: "4512170111401984".'),
        slug: z.string().describe('Slug of the team after the update. Example: "nango-seed-team".'),
        name: z.string().describe('Display name of the team after the update. Example: "Nango Seed Team".'),
        dateCreated: z.string().optional().describe('ISO 8601 timestamp of when the team was created. Example: "2026-09-29T14:26:48.828608Z".'),
        isMember: z.boolean().describe('Whether the authenticated member is on the team.'),
        teamRole: z
            .string()
            .optional()
            .describe('Team-level role of the authenticated member, e.g. "admin" or "contributor". Omitted when the member has no team role.'),
        hasAccess: z.boolean().describe('Whether the authenticated member has access to the team.'),
        isPending: z.boolean().describe('Whether the membership of the authenticated member on the team is pending.'),
        memberCount: z.number().describe('Number of organization members on the team. Example: 1.'),
        access: z.array(z.string()).describe('Permission scopes the authenticated member has on the team. Example: ["team:read", "team:write"].'),
        flags: z
            .object({
                'idp:provisioned': z.boolean().optional().describe('Whether the team is provisioned and managed by an external identity provider.')
            })
            .describe('Team feature flags.'),
        avatar: z
            .object({
                avatarType: z.string().describe('Avatar type, e.g. "letter_avatar" or "upload".'),
                avatarUuid: z.string().optional().describe('UUID of the uploaded avatar image. Omitted when the team has no uploaded avatar.'),
                avatarUrl: z.string().optional().describe('URL of the uploaded avatar image. Omitted when the team has no uploaded avatar.')
            })
            .describe('Team avatar.')
    })
    .describe('The team after the update.');

/**
 * @tags: [write]
 * @tagReason: Updates a team's attributes through a single PUT mutation; the action performs no reads and deletes nothing.
 * @pitfalls: Renaming the slug makes the old slug stop resolving immediately, so later calls must use the returned slug or the numeric team ID. Calling without slug or name is accepted and returns the team unchanged. The access array in the output reflects the acting member's organization role, not the token's granted scopes.
 */
const action = createAction({
    description: 'Update the slug, name, or other settings of a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/teams/update-a-team/
            endpoint: `/0/teams/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.team_id_or_slug)}/`,
            data: {
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.name !== undefined && { name: input.name })
            },
            // Safe to retry: PUT sets absolute field values, so a retry re-applies the same state. Edge case: renaming the slug through a slug-keyed path can make a late retry 404 after the update already succeeded.
            retries: 3
        };

        const response = await nango.put(config);
        const team = TeamResponseSchema.parse(response.data);

        return {
            id: team.id,
            slug: team.slug,
            name: team.name,
            ...(team.dateCreated != null && { dateCreated: team.dateCreated }),
            isMember: team.isMember,
            ...(team.teamRole != null && { teamRole: team.teamRole }),
            hasAccess: team.hasAccess,
            isPending: team.isPending,
            memberCount: team.memberCount,
            access: team.access,
            flags: {
                ...(team.flags['idp:provisioned'] !== undefined && { 'idp:provisioned': team.flags['idp:provisioned'] })
            },
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
