import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization to retrieve. Example: "the-interstellar-jurisdiction"')
    })
    .describe('Input for retrieving a Sentry organization');

const OrganizationStatusSchema = z
    .object({
        id: z.string().describe('Machine-readable status of the organization. Example: "active"'),
        name: z.string().describe('Human-readable status of the organization. Example: "active"')
    })
    .describe('Current status of the organization');

const OrganizationAvatarSchema = z
    .object({
        avatarType: z.string().describe('Type of avatar shown for the organization. Example: "letter_avatar"'),
        avatarUuid: z.string().nullable().describe('UUID of the uploaded avatar image, or null when no custom avatar is set'),
        avatarUrl: z.string().nullable().optional().describe('URL of the organization avatar image, or null when no custom avatar is set')
    })
    .describe('Avatar settings of the organization');

const OrganizationLinksSchema = z
    .object({
        organizationUrl: z.string().describe('Absolute URL of the organization in Sentry. Example: "https://the-interstellar-jurisdiction.sentry.io"'),
        regionUrl: z.string().describe('Base URL of the Sentry region hosting the organization. Example: "https://us.sentry.io"')
    })
    .describe('URLs related to the organization');

const OutputSchema = z
    .object({
        id: z.string().describe('Numeric ID of the organization, returned as a string. Example: "2"'),
        slug: z.string().describe('URL-friendly slug of the organization. Example: "the-interstellar-jurisdiction"'),
        name: z.string().describe('Display name of the organization. Example: "The Interstellar Jurisdiction"'),
        status: OrganizationStatusSchema,
        dateCreated: z.string().describe('ISO 8601 timestamp of when the organization was created. Example: "2018-11-06T21:19:55.101Z"'),
        isEarlyAdopter: z.boolean().describe('Whether the organization opts into early access features'),
        require2FA: z.boolean().describe('Whether the organization requires two-factor authentication for all members'),
        allowMemberInvite: z.boolean().describe('Whether non-admin members can invite new members to the organization'),
        allowMemberProjectCreation: z.boolean().describe('Whether non-admin members can create projects in the organization'),
        allowSuperuserAccess: z.boolean().describe('Whether Sentry staff superusers may access the organization for support purposes'),
        hasAuthProvider: z.boolean().describe('Whether the organization has a single sign-on (SSO) provider configured'),
        avatar: OrganizationAvatarSchema,
        links: OrganizationLinksSchema,
        access: z
            .array(z.string())
            .describe(
                'Organization permission scopes shown in the Sentry UI for the calling member\'s org role. Example: ["org:read", "org:write", "project:read"]'
            )
    })
    .describe('Details of the connected Sentry organization');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of organization details; it never mutates provider state.
 * @pitfalls: The returned `access` array reflects the calling member's org-role permissions shown in the Sentry UI, not the API token's actual scope grant; it can list scopes the token does not hold, so it cannot predict whether permission-gated calls (such as deletions) will succeed.
 */
const action = createAction({
    description: 'Retrieve details for the connected Sentry organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/organizations/retrieve-an-organization/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/`,
            params: {
                detailed: '0'
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
