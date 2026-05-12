import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization: z.string().optional().describe('Organization URI to filter memberships. Example: "https://api.calendly.com/organizations/ABC123"'),
    user: z.string().optional().describe('User URI to filter memberships. Example: "https://api.calendly.com/users/XYZ789"'),
    email: z.string().optional().describe('Email address to filter memberships. Example: "user@example.com"'),
    count: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100). Default varies by Calendly.'),
    page_token: z.string().optional().describe('Pagination token from a previous response to fetch the next page.')
});

const UserSchema = z.object({
    uri: z.string().describe('User URI. Example: "https://api.calendly.com/users/XYZ789"'),
    name: z.string().describe('Full name of the user.'),
    email: z.string().describe('Email address of the user.'),
    scheduling_url: z.string().describe('User scheduling URL.'),
    timezone: z.string().describe('User timezone.'),
    created_at: z.string().describe('ISO 8601 timestamp when user was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when user was last updated.')
});

const OrganizationSchema = z.object({
    uri: z.string().describe('Organization URI. Example: "https://api.calendly.com/organizations/ABC123"')
});

const MembershipSchema = z.object({
    uri: z.string().describe('Unique membership URI. Example: "https://api.calendly.com/organization_memberships/UUID"'),
    role: z.enum(['owner', 'admin', 'user']).describe('Role of the user in the organization.'),
    user: UserSchema,
    organization: OrganizationSchema,
    created_at: z.string().describe('ISO 8601 timestamp when membership was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when membership was last updated.')
});

const PaginationSchema = z.object({
    count: z.number().int().describe('Number of items in the current page.'),
    next_page_token: z.string().optional().describe('Token to fetch the next page of results.')
});

const OutputSchema = z.object({
    collection: z.array(MembershipSchema).describe('Array of organization membership records.'),
    pagination: PaginationSchema.describe('Pagination metadata for navigating results.')
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getString(obj: Record<string, unknown>, key: string): string {
    const value = obj[key];
    return typeof value === 'string' ? value : '';
}

function getObject(obj: Record<string, unknown>, key: string): Record<string, unknown> {
    const value = obj[key];
    return isRecord(value) ? value : {};
}

function getNumber(obj: Record<string, unknown>, key: string, defaultValue: number): number {
    const value = obj[key];
    return typeof value === 'number' ? value : defaultValue;
}

type MembershipRole = 'owner' | 'admin' | 'user';

function getRole(obj: Record<string, unknown>): MembershipRole {
    const value = getString(obj, 'role');
    if (value === 'owner' || value === 'admin' || value === 'user') {
        return value;
    }
    return 'user';
}

const action = createAction({
    description: 'List organization memberships from Calendly.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-organization-memberships',
        group: 'Organization Memberships'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationUri = input.organization;
        let userUri = input.user;

        // If neither organization nor user is provided, fetch current user
        if (!organizationUri && !userUri) {
            // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
            const userResponse = await nango.get({
                endpoint: '/users/me',
                retries: 3
            });

            if (!isRecord(userResponse.data)) {
                throw new nango.ActionError({
                    type: 'invalid_user_response',
                    message: 'Failed to fetch current user information'
                });
            }

            const userResource = getObject(userResponse.data, 'resource');
            const userUriFromResponse = getString(userResource, 'uri');

            if (!userUriFromResponse) {
                throw new nango.ActionError({
                    type: 'no_user_uri',
                    message: 'Could not determine current user URI'
                });
            }

            userUri = userUriFromResponse;
        }

        // https://developer.calendly.com/api-docs/e7050e38e1707-list-organization-memberships
        const response = await nango.get({
            endpoint: '/organization_memberships',
            params: {
                ...(organizationUri && { organization: organizationUri }),
                ...(userUri && { user: userUri }),
                ...(input.email && { email: input.email }),
                ...(input.count && { count: String(input.count) }),
                ...(input.page_token && { page_token: input.page_token })
            },
            retries: 3
        });

        const providerData = response.data;

        if (!isRecord(providerData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Calendly API'
            });
        }

        const collection = Array.isArray(providerData['collection']) ? providerData['collection'] : [];
        const pagination = isRecord(providerData['pagination']) ? providerData['pagination'] : {};

        const memberships = collection.map((item: unknown) => {
            if (!isRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_membership_data',
                    message: 'Invalid membership data received from provider'
                });
            }

            const user = getObject(item, 'user');
            const organization = getObject(item, 'organization');

            return {
                uri: getString(item, 'uri'),
                role: getRole(item),
                user: {
                    uri: getString(user, 'uri'),
                    name: getString(user, 'name'),
                    email: getString(user, 'email'),
                    scheduling_url: getString(user, 'scheduling_url'),
                    timezone: getString(user, 'timezone'),
                    created_at: getString(user, 'created_at'),
                    updated_at: getString(user, 'updated_at')
                },
                organization: {
                    uri: getString(organization, 'uri')
                },
                created_at: getString(item, 'created_at'),
                updated_at: getString(item, 'updated_at')
            };
        });

        const paginationOutput: { count: number; next_page_token?: string } = {
            count: getNumber(pagination, 'count', memberships.length)
        };

        const nextToken = getString(pagination, 'next_page_token');
        if (nextToken) {
            paginationOutput.next_page_token = nextToken;
        }

        return {
            collection: memberships,
            pagination: paginationOutput
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
