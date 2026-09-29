import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization whose members to list. Example: "nangodev"'),
        cursor: z.string().optional().describe('Pagination cursor returned as nextCursor by a previous call. Omit for the first page.'),
        query: z
            .string()
            .optional()
            .describe(
                'Optional filter for members. Supports prefixes such as id:, user.id:, email:, role:, scope:, isInvited:, ssoLinked:, has2fa:, hasExternalUsers:. Example: "email:sirpenguin@antarcticarocks.com"'
            )
    })
    .describe('Input for listing the members of a Sentry organization.');

const MemberUserSchema = z.object({
    id: z.string().describe('ID of the linked Sentry user account.'),
    name: z.string().describe('Display name of the user.'),
    username: z.string().describe('Username of the user, typically the email address.'),
    email: z.string().describe('Email address of the user.'),
    avatarUrl: z.string().describe('URL of the user avatar image.'),
    isActive: z.boolean().describe('Whether the user account is active.'),
    isManaged: z.boolean().describe('Whether the user account is managed by an external identity provider.'),
    has2fa: z.boolean().describe('Whether the user has two-factor authentication enabled.'),
    dateJoined: z.string().describe('ISO 8601 timestamp of when the user account was created.'),
    lastLogin: z.string().nullable().describe('ISO 8601 timestamp of the last login, or null if the user has never logged in.'),
    lastActive: z.string().nullable().describe('ISO 8601 timestamp of the last activity, or null if the user has never been active.')
});

const MemberSchema = z.object({
    id: z.string().describe('ID of the organization member.'),
    email: z.string().describe('Email address of the member.'),
    name: z.string().describe('Display name of the member.'),
    user: MemberUserSchema.nullable().describe('The linked Sentry user account, or null when the membership is an invite that has not been accepted yet.'),
    orgRole: z.string().describe('Organization-level role of the member, e.g. "owner", "manager", "billing", "member".'),
    pending: z.boolean().describe('Whether the membership is an invite that is still waiting to be accepted.'),
    expired: z.boolean().describe('Whether the membership invite has expired.'),
    inviteStatus: z.string().describe('Status of the invite, e.g. "approved", "pending", "requested_to_be_invited", "requested_to_join".'),
    inviterName: z.string().nullable().describe('Name or email of the member who sent the invite, or null when not applicable.'),
    dateCreated: z.string().describe('ISO 8601 timestamp of when the membership was created.')
});

const OutputSchema = z
    .object({
        members: z.array(MemberSchema).describe('The organization members in the current page.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more results.')
    })
    .describe('The page of organization members and the cursor for fetching the next page.');

function parseNextCursor(linkHeader: string): string | undefined {
    const nextPart = linkHeader
        .split(',')
        .map((part) => part.trim())
        .find((part) => part.includes('rel="next"'));
    if (!nextPart || !nextPart.includes('results="true"')) {
        return undefined;
    }
    const attributeMatch = /cursor="([^"]+)"/.exec(nextPart);
    if (attributeMatch?.[1]) {
        return attributeMatch[1];
    }
    const urlMatch = /[?&]cursor=([^&>]+)/.exec(nextPart);
    if (urlMatch?.[1]) {
        return decodeURIComponent(urlMatch[1]);
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only reads organization members via a GET request and makes no changes on the provider.
 * @pitfalls: The list includes pending invites that have not been accepted yet; those members have a null user object and pending set to true. An unrecognized field in the query filter silently returns no results instead of an error.
 */
const action = createAction({
    description: 'List members of the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['member:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/organizations/list-an-organizations-members/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/members/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        });

        const members = z.array(MemberSchema).parse(response.data ?? []);

        // Sentry paginates through the Link response header; there is no cursor field in the JSON body.
        const rawLinkHeader: unknown = response.headers['link'];
        const nextCursor = typeof rawLinkHeader === 'string' ? parseNextCursor(rawLinkHeader) : undefined;

        return {
            members,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
