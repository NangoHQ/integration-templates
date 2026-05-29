import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    user_id: z.string().describe('User ID of the organization member to remove roles from. Example: "auth0|123456789"'),
    roles: z.array(z.string()).min(1).describe('List of role IDs to remove from the organization member. Example: ["rol_abc123", "rol_def456"]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove roles from an organization member in Auth0',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-organization-member-roles',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:organization_member_roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/organizations/delete-organization-member-roles
        await nango.delete({
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/members/${encodeURIComponent(input.user_id)}/roles`,
            data: {
                roles: input.roles
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
