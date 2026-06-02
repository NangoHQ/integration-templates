import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the role to retrieve. Example: "rol_abc123"')
});

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single role from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-role',
        group: 'Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/roles/get-roles-by-id
            endpoint: `/api/v2/roles/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Role not found',
                id: input.id
            });
        }

        const providerRole = ProviderRoleSchema.parse(response.data);

        return {
            id: providerRole.id,
            name: providerRole.name,
            ...(providerRole.description !== undefined && { description: providerRole.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
