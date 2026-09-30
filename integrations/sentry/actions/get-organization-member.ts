import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the member belongs to. Example: "nangodev"'),
        member_id: z.string().describe('The ID of the organization member to retrieve. Example: "15174593"')
    })
    .describe('Input for retrieving a single organization member');

const MemberUserSchema = z
    .object({
        id: z.string().describe('The ID of the Sentry user account linked to this membership. Example: "280094367316"'),
        email: z.string().describe('Email address of the user account. Example: "sirpenguin@antarcticarocks.com"'),
        name: z.string().describe('Display name of the user account. Example: "Sir Penguin"'),
        username: z.string().describe('Username of the user account, typically the email address. Example: "sirpenguin@antarcticarocks.com"'),
        avatarUrl: z
            .string()
            .describe('URL of the user avatar image. Example: "https://secure.gravatar.com/avatar/16aeb26c5fdba335c7078e9e9ddb5149?s=32&d=mm"'),
        isActive: z.boolean().describe('Whether the user account is active'),
        isManaged: z.boolean().describe('Whether the user account is managed by an external identity provider'),
        isSuperuser: z.boolean().describe('Whether the user account has Sentry superuser privileges'),
        isStaff: z.boolean().describe('Whether the user account has Sentry staff privileges'),
        isSuspended: z.boolean().describe('Whether the user account is suspended'),
        has2fa: z.boolean().describe('Whether the user account has two-factor authentication enabled'),
        dateJoined: z.string().describe('ISO 8601 timestamp of when the user account was created. Example: "2021-07-06T21:13:58.375239Z"'),
        lastLogin: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of the user\'s last login. Omitted when the user has never logged in. Example: "2021-08-02T18:25:00.051182Z"'),
        lastActive: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of the user\'s last activity. Omitted when there is no recorded activity. Example: "2021-08-02T21:32:18.836829Z"')
    })
    .describe('Sentry user account linked to this membership. Omitted for pending invites that have not been accepted yet');

const MemberFlagsSchema = z
    .object({
        'sso:linked': z.boolean().describe('Whether the member has linked their account to single sign-on'),
        'sso:invalid': z.boolean().describe("Whether the member's single sign-on link is invalid"),
        'member-limit:restricted': z.boolean().describe("Whether the member is restricted by the organization's member limit"),
        'idp:provisioned': z.boolean().describe('Whether the member was provisioned by an identity provider'),
        'idp:role-restricted': z.boolean().describe("Whether the member's role is restricted by an identity provider"),
        'partnership:restricted': z.boolean().describe('Whether the member is restricted by a partnership')
    })
    .describe('Flags describing membership constraints and provisioning state');

const MemberTeamRoleSchema = z
    .object({
        teamSlug: z.string().describe('Slug of the team the member belongs to. Example: "cool-team"'),
        role: z
            .string()
            .optional()
            .describe('The member\'s role within the team, such as "admin" or "contributor". Omitted when the member has no explicit team role')
    })
    .describe("Team membership with the member's role in that team");

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the organization member. Example: "57377908164"'),
        email: z.string().describe('Email address the membership is bound to. Example: "sirpenguin@antarcticarocks.com"'),
        name: z.string().describe('Display name of the member. Example: "Sir Penguin"'),
        user: MemberUserSchema.optional(),
        role: z.string().optional().describe('Deprecated alias of orgRole. Example: "member"'),
        orgRole: z.string().describe('Organization-level role of the member, such as "member", "admin", "manager", "owner", or "billing". Example: "member"'),
        roleName: z.string().describe('Human-readable name of the organization role. Example: "Member"'),
        pending: z.boolean().describe('Whether the membership is a pending invite that has not been accepted yet'),
        expired: z.boolean().describe('Whether the pending invite has expired'),
        flags: MemberFlagsSchema,
        dateCreated: z.string().describe('ISO 8601 timestamp of when the membership was created. Example: "2021-07-06T21:13:01.120263Z"'),
        inviteStatus: z.string().describe('Status of the invite, such as "approved", "requested_to_be_invited", or "requested_to_join". Example: "approved"'),
        inviterName: z.string().optional().describe('Name or email of the member who sent the invite. Omitted when the member was not invited by someone'),
        invite_link: z.string().optional().describe('URL of the invite link for a pending invite. Omitted when no invite link exists'),
        teams: z.array(z.string()).describe('Slugs of the teams the member belongs to. Example: ["cool-team", "ancient-gabelers"]'),
        teamRoles: z.array(MemberTeamRoleSchema).describe('Team memberships with per-team roles'),
        isOnlyOwner: z.boolean().describe('Whether the member is the only owner of the organization')
    })
    .describe('A single Sentry organization member');

const SentryMemberUserSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    username: z.string(),
    avatarUrl: z.string(),
    isActive: z.boolean(),
    isManaged: z.boolean(),
    isSuperuser: z.boolean(),
    isStaff: z.boolean(),
    isSuspended: z.boolean(),
    has2fa: z.boolean(),
    dateJoined: z.string(),
    lastLogin: z.string().nullable(),
    lastActive: z.string().nullable()
});

const SentryMemberSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    user: SentryMemberUserSchema.nullable(),
    role: z.string().optional(),
    orgRole: z.string(),
    roleName: z.string(),
    pending: z.boolean(),
    expired: z.boolean(),
    flags: z.object({
        'sso:linked': z.boolean(),
        'sso:invalid': z.boolean(),
        'member-limit:restricted': z.boolean(),
        'idp:provisioned': z.boolean(),
        'idp:role-restricted': z.boolean(),
        'partnership:restricted': z.boolean()
    }),
    dateCreated: z.string(),
    inviteStatus: z.string(),
    inviterName: z.string().nullable(),
    invite_link: z.string().nullable().optional(),
    teams: z.array(z.string()),
    teamRoles: z.array(
        z.object({
            teamSlug: z.string(),
            role: z.string().nullable()
        })
    ),
    isOnlyOwner: z.boolean()
});

/**
 * @tags: [read]
 * @tagReason: Only fetches a single organization member from the provider without mutating anything.
 * @pitfalls: A member ID can resolve to a pending invite that has not been accepted yet; in that case pending is true and the user object is omitted because no account is linked yet. inviterName, invite_link, lastLogin, and lastActive are omitted whenever the provider returns no value for them.
 */
const action = createAction({
    description: 'Retrieve a single organization member.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['member:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.sentry.io/api/organizations/retrieve-an-organization-member/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/members/${encodeURIComponent(input.member_id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization member not found',
                organization_id_or_slug: input.organization_id_or_slug,
                member_id: input.member_id
            });
        }

        const member = SentryMemberSchema.parse(response.data);

        return {
            id: member.id,
            email: member.email,
            name: member.name,
            ...(member.user != null && {
                user: {
                    id: member.user.id,
                    email: member.user.email,
                    name: member.user.name,
                    username: member.user.username,
                    avatarUrl: member.user.avatarUrl,
                    isActive: member.user.isActive,
                    isManaged: member.user.isManaged,
                    isSuperuser: member.user.isSuperuser,
                    isStaff: member.user.isStaff,
                    isSuspended: member.user.isSuspended,
                    has2fa: member.user.has2fa,
                    dateJoined: member.user.dateJoined,
                    ...(member.user.lastLogin != null && { lastLogin: member.user.lastLogin }),
                    ...(member.user.lastActive != null && { lastActive: member.user.lastActive })
                }
            }),
            ...(member.role !== undefined && { role: member.role }),
            orgRole: member.orgRole,
            roleName: member.roleName,
            pending: member.pending,
            expired: member.expired,
            flags: member.flags,
            dateCreated: member.dateCreated,
            inviteStatus: member.inviteStatus,
            ...(member.inviterName != null && { inviterName: member.inviterName }),
            ...(member.invite_link != null && { invite_link: member.invite_link }),
            teams: member.teams,
            teamRoles: member.teamRoles.map((teamRole) => ({
                teamSlug: teamRole.teamSlug,
                ...(teamRole.role != null && { role: teamRole.role })
            })),
            isOnlyOwner: member.isOnlyOwner
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
