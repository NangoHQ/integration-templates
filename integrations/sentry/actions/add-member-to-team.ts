import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization the team belongs to. Example: "nangodev".'),
        member_id: z.string().describe('The numeric ID of the organization member to add to the team. Example: "15174593".'),
        team_id_or_slug: z.string().describe('The ID or slug of the team to add the member to. Example: "nango-seed-team".')
    })
    .describe('Identifies the organization, the organization member, and the team to add the member to.');

const ProviderTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    dateCreated: z.string().nullable().optional(),
    memberCount: z.number().optional()
});

const OutputTeamSchema = z.object({
    id: z.string().describe('The numeric ID of the team. Example: "4512170111401984".'),
    slug: z.string().describe('The slug of the team. Example: "nango-seed-team".'),
    name: z.string().describe('The display name of the team.'),
    dateCreated: z.string().optional().describe('The ISO 8601 timestamp when the team was created. Omitted when Sentry returns null.'),
    memberCount: z.number().optional().describe('The total number of members on the team after the add.')
});

const OutputSchema = z
    .object({
        status: z
            .enum(['added', 'access_requested', 'already_member'])
            .describe(
                'Outcome of the operation: "added" when the member joined the team, "access_requested" when a join access request was generated and is pending approval (the member is not on the team yet), or "already_member" when the member was already on the team.'
            ),
        team: OutputTeamSchema.optional().describe('The team the member was added to. Present only when status is "added".')
    })
    .describe('The outcome of adding the member to the team.');

/**
 * @tags: [write]
 * @tagReason: Adds an organization member to a team, which is a provider-side mutation with no provider reads.
 * @pitfalls: A successful call does not guarantee membership was added: the member may already be on the team (a no-op) or a join access request may have been generated for approval instead, so check status. The token scope required depends on the organization's "Open Membership" setting. Members cannot be added to identity-provider-provisioned teams.
 */
const action = createAction({
    description: 'Add an organization member to a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/teams/add-an-organization-member-to-a-team/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/members/${encodeURIComponent(input.member_id)}/teams/${encodeURIComponent(input.team_id_or_slug)}/`,
            // Safe to retry: re-adding an existing member is a 204 no-op; the side-effecting 202 access-request path only applies to closed-membership organizations with member-scoped tokens.
            retries: 3
        };

        const response = await nango.post(config);

        if (response.status === 204) {
            return { status: 'already_member' };
        }

        if (response.status === 202) {
            return { status: 'access_requested' };
        }

        const team = ProviderTeamSchema.parse(response.data);

        return {
            status: 'added',
            team: {
                id: team.id,
                slug: team.slug,
                name: team.name,
                ...(team.dateCreated != null && { dateCreated: team.dateCreated }),
                ...(team.memberCount !== undefined && { memberCount: team.memberCount })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
