import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const UserMeSchema = z.object({
    resource: z
        .object({
            current_organization: z.string().optional()
        })
        .optional()
});

const OrganizationSchema = z.object({
    resource: z
        .object({
            uri: z.string(),
            name: z.string(),
            locale: z.string().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    uri: z.string().describe('Organization URI. Example: "https://api.calendly.com/organizations/12345678-1234-1234-1234-123456789012"'),
    name: z.string().describe('Organization name. Example: "Acme Inc"'),
    locale: z.string().optional().describe('Organization locale. Example: "en"'),
    created_at: z.string().optional().describe('Organization creation timestamp. Example: "2023-01-01T00:00:00Z"'),
    updated_at: z.string().optional().describe('Organization update timestamp. Example: "2023-01-01T00:00:00Z"')
});

const action = createAction({
    description: 'Fetch the authenticated user organization',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizations:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
        const userResponse = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        if (!userResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Failed to retrieve user information'
            });
        }

        const userData = UserMeSchema.parse(userResponse.data);
        const organizationUri = userData.resource?.current_organization;

        if (!organizationUri) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User does not belong to an organization'
            });
        }

        // Extract the organization UUID from the URI
        const organizationUuid = organizationUri.split('/').pop();

        if (!organizationUuid) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Could not extract organization UUID from URI',
                organization_uri: organizationUri
            });
        }

        // https://developer.calendly.com/api-docs/9738aea27ba80-get-organization
        const orgResponse = await nango.get({
            endpoint: `/organizations/${organizationUuid}`,
            retries: 3
        });

        if (!orgResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                organization_uuid: organizationUuid
            });
        }

        const orgData = OrganizationSchema.parse(orgResponse.data);

        if (!orgData.resource) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Organization resource not found in response'
            });
        }

        return {
            uri: orgData.resource.uri,
            name: orgData.resource.name,
            ...(orgData.resource.locale !== undefined && { locale: orgData.resource.locale }),
            ...(orgData.resource.created_at !== undefined && { created_at: orgData.resource.created_at }),
            ...(orgData.resource.updated_at !== undefined && { updated_at: orgData.resource.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
