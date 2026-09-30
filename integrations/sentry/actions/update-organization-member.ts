import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const TeamRoleInputSchema = z.object({
    teamSlug: z.string().describe('Slug of the team to assign the member to. Example: "ancient-gabelers"'),
    role: z.enum(['contributor', 'admin']).describe('Team-level role to grant the member on this team: "contributor" or "admin".')
});

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the member belongs to. Example: "nangodev"'),
        member_id: z.string().describe('ID of the organization member to update. Example: "57377908164"'),
        orgRole: z
            .enum(['billing', 'member', 'manager', 'owner', 'admin'])
            .optional()
            .describe(
                'New organization-level role for the member: "billing", "member", "manager", "owner" or "admin". Restricted to user auth tokens, and the acting user may only assign roles at or below their own organization role. Omit to leave the organization role unchanged.'
            ),
        teamRoles: z
            .array(TeamRoleInputSchema)
            .nullable()
            .optional()
            .describe(
                'Complete replacement set of team role assignments for the member; any team the member currently belongs to that is not listed here is removed. The API also accepts null. Omit to leave team assignments unchanged.'
            )
    })
    .describe('Update to apply to an organization member: a new organization-level role, a replacement set of team role assignments, or both.');

const TeamRoleSchema = z.object({
    teamSlug: z.string().describe('Slug of the team the member belongs to.'),
    role: z
        .string()
        .nullable()
        .describe('Team-level role of the member on this team ("contributor" or "admin"), or null for plain team membership without an elevated team role.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the organization member.'),
        email: z.string().describe('Email address of the member.'),
        name: z.string().describe('Display name of the member; defaults to the email address for invited members.'),
        orgRole: z.string().describe('Organization-level role of the member after the update. Example: "member"'),
        pending: z.boolean().describe('Whether the member invitation is still pending acceptance.'),
        expired: z.boolean().describe('Whether the member invitation has expired.'),
        inviteStatus: z.string().describe('Invitation approval status of the member. Example: "approved"'),
        isOnlyOwner: z.boolean().describe('Whether the member is the only owner of the organization.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the membership was created.'),
        teams: z.array(z.string()).describe('Slugs of all teams the member belongs to after the update.'),
        teamRoles: z.array(TeamRoleSchema).describe('Per-team role assignments of the member after the update.')
    })
    .describe('The organization member as it stands after the update, including its organization-level role, team memberships, and per-team role assignments.');

const ProviderMemberSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    orgRole: z.string(),
    pending: z.boolean(),
    expired: z.boolean(),
    inviteStatus: z.string(),
    isOnlyOwner: z.boolean(),
    dateCreated: z.string(),
    teams: z.array(z.string()),
    teamRoles: z.array(
        z.object({
            teamSlug: z.string(),
            role: z.string().nullable()
        })
    )
});

/**
 * @tags: [write]
 * @tagReason: Mutates an organization member's organization-level role and team-level role assignments through a PUT request; performs no provider reads.
 * @pitfalls: teamRoles replaces the member's team assignments wholesale; any team the member belongs to that is omitted from the list is removed, and an empty list removes all team memberships. Changing orgRole is restricted to user auth tokens, and both the member's current role and the target role must rank at or below the acting user's own org role. Credentials with member:write or member:invite but without member:admin can only resend invites and are rejected on role updates, so callers may get 400/403 depending on the acting credentials even when the request is well-formed.
 */
const action = createAction({
    description: "Update a member's organization-level role and/or per-team roles.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['member:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.orgRole === undefined && input.teamRoles === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one of orgRole or teamRoles to update.'
            });
        }

        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/organizations/update-an-organization-members-roles/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/members/${encodeURIComponent(input.member_id)}/`,
            data: {
                ...(input.orgRole !== undefined && { orgRole: input.orgRole }),
                ...(input.teamRoles !== undefined && { teamRoles: input.teamRoles })
            },
            // Role assignment PUTs are idempotent: replaying the same payload re-applies the same end state, so the standard retry ceiling is safe here.
            retries: 3
        };

        const response = await nango.put(config);
        const member = ProviderMemberSchema.parse(response.data);

        return {
            id: member.id,
            email: member.email,
            name: member.name,
            orgRole: member.orgRole,
            pending: member.pending,
            expired: member.expired,
            inviteStatus: member.inviteStatus,
            isOnlyOwner: member.isOnlyOwner,
            dateCreated: member.dateCreated,
            teams: member.teams,
            teamRoles: member.teamRoles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
