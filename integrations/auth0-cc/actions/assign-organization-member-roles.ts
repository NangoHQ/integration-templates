import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    user_id: z.string().describe('ID of the user to associate roles with. Example: "auth0|123"'),
    role_ids: z.array(z.string()).describe('List of role IDs to associate with the user. Example: ["rol_abc123"]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Assign roles to an organization member in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/assign-organization-member-roles',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:organization_member_roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://auth0.com/docs/api/management/v2/organizations/post-organizations-members-roles
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/members/${encodeURIComponent(input.user_id)}/roles`,
            data: {
                roles: input.role_ids
            },
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
