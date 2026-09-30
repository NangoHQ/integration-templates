import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization to invite the member to. Example: "my-org"'),
        email: z.email().describe('Email address the invitation is sent to. Example: "jane.doe@example.com"'),
        orgRole: z
            .enum(['billing', 'member', 'manager', 'owner', 'admin'])
            .optional()
            .describe('Organization-level role to assign to the new member. Defaults to "member" when omitted'),
        teamRoles: z
            .array(
                z
                    .object({
                        teamSlug: z.string().describe('Slug of the team the member is added to upon acceptance. Example: "backend"'),
                        role: z
                            .enum(['contributor', 'admin'])
                            .describe('Team-level role: "contributor" can view and act on issues; "admin" has full management access to the team')
                    })
                    .describe('Team assignment with the team-level role for the invited member')
            )
            .optional()
            .describe('Teams, with their team-level roles, to add the invited member to upon acceptance'),
        sendInvite: z.boolean().optional().describe('Whether Sentry sends the invitation notification email to the invitee. Defaults to true when omitted')
    })
    .describe('Input for inviting a new member to a Sentry organization by email');

const MemberResponseSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    orgRole: z.string(),
    pending: z.boolean(),
    expired: z.boolean(),
    inviteStatus: z.string(),
    inviterName: z.string().nullable(),
    dateCreated: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the organization membership. Example: "57377908164"'),
        email: z.string().describe('Email address of the invited member'),
        name: z.string().describe('Display name of the member; for pending invites without a Sentry account this mirrors the email'),
        orgRole: z.string().describe('Organization-level role assigned to the member. Example: "member"'),
        pending: z.boolean().describe('True while the invitation has been issued but not yet accepted'),
        expired: z.boolean().describe('True if the invitation has expired'),
        inviteStatus: z.string().describe('Invite approval state, e.g. "approved" for an auto-approved invitation. Example: "approved"'),
        inviterName: z.string().optional().describe('Name of the user who sent the invitation; omitted when the invite has no user inviter'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the membership was created. Example: "2021-07-06T21:13:01.120263Z"')
    })
    .describe('The invited organization member');

/**
 * @tags: [write]
 * @tagReason: Creates a new organization membership invitation through a provider POST mutation.
 * @pitfalls: Sends a real invitation email by default; set sendInvite to false to suppress it. The invite fails if the email is already a member or already has an approved pending invite, rather than updating the existing member. The requested orgRole must not exceed the inviter's own allowed roles, and the admin role cannot be assigned on Business or Enterprise plans.
 */
const action = createAction({
    description: 'Invite a new member to a Sentry organization by email',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['member:invite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/organizations/add-a-member-to-an-organization/
        const response = await nango.post({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/members/`,
            data: {
                email: input.email,
                ...(input.orgRole !== undefined && { orgRole: input.orgRole }),
                ...(input.teamRoles !== undefined && { teamRoles: input.teamRoles }),
                ...(input.sendInvite !== undefined && { sendInvite: input.sendInvite })
            },
            // Not idempotent: retrying after a lost response would send a duplicate invite email, so this call must not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const member = MemberResponseSchema.parse(response.data);

        return {
            id: member.id,
            email: member.email,
            name: member.name,
            orgRole: member.orgRole,
            pending: member.pending,
            expired: member.expired,
            inviteStatus: member.inviteStatus,
            dateCreated: member.dateCreated,
            ...(member.inviterName != null && { inviterName: member.inviterName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
