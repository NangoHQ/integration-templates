import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the role. Example: "Admin"'),
    description: z.string().optional().describe('Description of the role. Example: "Administrator role with full access"')
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
    description: 'Create a role in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/roles/post-roles
            endpoint: '/api/v2/roles',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

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
