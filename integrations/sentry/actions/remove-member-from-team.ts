import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the team belongs to. Example: "acme".'),
        member_id: z.string().describe('The ID of the organization member to remove from the team. Example: "1234567".'),
        team_id_or_slug: z.string().describe('The ID or slug of the team to remove the member from. Example: "backend".')
    })
    .describe('Identifies the organization member to remove and the team to remove them from');

const TeamAvatarSchema = z
    .object({
        avatarType: z.string().describe('Avatar type, e.g. "letter_avatar" or "upload".'),
        avatarUuid: z.string().nullable().describe('Avatar UUID, or null when the team uses a letter avatar.'),
        avatarUrl: z.string().nullable().describe('Avatar image URL, or null when no custom avatar is set.')
    })
    .describe('Team avatar details');

const OutputSchema = z
    .object({
        id: z.string().describe('Sentry team ID. Example: "4502349234123".'),
        slug: z.string().describe('URL-friendly team slug. Example: "backend".'),
        name: z.string().describe('Human-readable team name.'),
        dateCreated: z.string().nullable().describe('ISO 8601 timestamp of when the team was created, or null if not set.'),
        isMember: z
            .boolean()
            .describe(
                "Whether the acting/authenticated user (the API token's own user), not input.member_id, is a member of this team. Unrelated to the member that was just removed."
            ),
        teamRole: z
            .string()
            .nullable()
            .describe(
                "The acting/authenticated user's (the API token's own user) team-level role, or null if they have none. Describes the caller, not input.member_id, and is unaffected by the removal."
            ),
        flags: z.record(z.string(), z.unknown()).describe('Team feature flags, e.g. idp:provisioned.'),
        access: z.array(z.string()).describe("Scopes available on the team based on the acting subject's organization role."),
        hasAccess: z.boolean().describe('Whether the acting subject has access to the team.'),
        isPending: z
            .boolean()
            .describe('Whether the acting/authenticated user has a pending access request for this team. Describes the caller, not input.member_id.'),
        memberCount: z.number().describe('Number of members remaining on the team.'),
        avatar: TeamAvatarSchema
    })
    .describe('The Sentry team after the member was removed');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a member's team membership through the provider API, a write that revokes team access and requires an explicit re-add to reverse.
 * @pitfalls: The response is a snapshot of the team as seen by the acting/authenticated user, not the removed member: isMember, teamRole, isPending, hasAccess, and access all describe the caller's own relationship to the team and are unaffected by the removal of input.member_id. Removing the token's own member record from a team immediately revokes team-admin rights on that team for subsequent calls, yet the response can still report hasAccess true and admin scopes in access because they reflect the caller's organization role, not the remaining permissions. A token with only the org:read scope can only remove its own user from teams it already belongs to.
 */
const action = createAction({
    description: 'Remove an organization member from a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:admin', 'org:read', 'org:write', 'team:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/teams/delete-an-organization-member-from-a-team/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/members/${encodeURIComponent(input.member_id)}/teams/${encodeURIComponent(input.team_id_or_slug)}/`,
            // Idempotent: a repeated DELETE returns 200 with the member already removed, so retries are safe.
            retries: 3
        };
        const response = await nango.delete(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
