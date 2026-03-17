import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const RoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    requiresBillingWrite: z.boolean()
});

const OutputSchema = z.object({
    roles: z.array(RoleSchema)
});

const action = createAction({
    description: 'List available user roles for a HubSpot enterprise account',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/fetch-roles',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.users.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/settings-user-provisioning-v3/roles/get-settings-v3-users-roles
        const response = await nango.get({
            endpoint: '/settings/v3/users/roles',
            retries: 3
        });

        const data = response.data;

        return {
            roles:
                data.results?.map((role: any) => ({
                    id: role.id,
                    name: role.name,
                    requiresBillingWrite: role.requiresBillingWrite ?? false
                })) ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
