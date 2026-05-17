import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uuid: z.string().describe('The unique identifier (UUID) of the organization membership. Example: "12345678-1234-1234-1234-123456789012"')
});

const ProviderOrganizationMembershipSchema = z.object({
    uri: z.string(),
    role: z.string(),
    organization: z.string(),
    user: z.object({
        uri: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        email: z.string().optional(),
        scheduling_url: z.string().optional(),
        timezone: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        locale: z.string().optional(),
        time_notation: z.string().optional(),
        avatar_url: z.string().nullable().optional()
    }),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    uri: z.string().describe('Canonical reference (unique identifier) for the organization membership'),
    role: z.string().describe('Role of the user within the organization (e.g., owner, admin, user)'),
    organization: z.string().describe('Canonical reference (unique identifier) for the organization'),
    user: z
        .object({
            uri: z.string().describe('Canonical reference (unique identifier) for the user'),
            name: z.string().optional().describe('Full name of the user'),
            slug: z.string().optional().describe('Unique slug of the user'),
            email: z.string().optional().describe('Email address of the user'),
            scheduling_url: z.string().optional().describe("Calendly URL for the user's scheduling page"),
            timezone: z.string().optional().describe("User's timezone"),
            created_at: z.string().optional().describe('Timestamp when the user was created'),
            updated_at: z.string().optional().describe('Timestamp when the user was last updated'),
            locale: z.string().optional().describe("User's locale"),
            time_notation: z.string().optional().describe("User's time notation preference (12h or 24h)"),
            avatar_url: z.string().optional().describe("URL of the user's avatar image")
        })
        .describe('Primary account details of the user'),
    created_at: z.string().optional().describe('Timestamp when the organization membership was created'),
    updated_at: z.string().optional().describe('Timestamp when the organization membership was last updated')
});

const action = createAction({
    description: 'Retrieve a single organization membership from Calendly',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-organization-membership',
        group: 'Organization Memberships'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['default'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/8c3baa79a5883-get-organization-membership
        const response = await nango.get({
            endpoint: `/organization_memberships/${input.uuid}`,
            retries: 3
        });

        if (!response.data || !response.data.resource) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization membership not found',
                uuid: input.uuid
            });
        }

        const membership = ProviderOrganizationMembershipSchema.parse(response.data.resource);

        return {
            uri: membership.uri,
            role: membership.role,
            organization: membership.organization,
            user: {
                uri: membership.user.uri,
                ...(membership.user.name !== undefined && { name: membership.user.name }),
                ...(membership.user.slug !== undefined && { slug: membership.user.slug }),
                ...(membership.user.email !== undefined && { email: membership.user.email }),
                ...(membership.user.scheduling_url !== undefined && { scheduling_url: membership.user.scheduling_url }),
                ...(membership.user.timezone !== undefined && { timezone: membership.user.timezone }),
                ...(membership.user.created_at !== undefined && { created_at: membership.user.created_at }),
                ...(membership.user.updated_at !== undefined && { updated_at: membership.user.updated_at }),
                ...(membership.user.locale !== undefined && { locale: membership.user.locale }),
                ...(membership.user.time_notation !== undefined && { time_notation: membership.user.time_notation }),
                ...(membership.user.avatar_url !== undefined && membership.user.avatar_url !== null && { avatar_url: membership.user.avatar_url })
            },
            ...(membership.created_at !== undefined && { created_at: membership.created_at }),
            ...(membership.updated_at !== undefined && { updated_at: membership.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
