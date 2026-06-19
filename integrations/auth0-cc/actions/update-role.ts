import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('ID of the role to update. Example: "rol_1234567890abcdef"'),
    name: z.string().optional().describe('Name of this role.'),
    description: z.string().optional().describe('Description of this role.')
});

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Update a role in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://auth0.com/docs/api/management/v2/roles/patch-roles-by-id
            endpoint: `/api/v2/roles/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const providerRole = ProviderRoleSchema.parse(response.data);

        return {
            id: providerRole.id,
            ...(providerRole.name !== undefined && { name: providerRole.name }),
            ...(providerRole.description !== undefined && { description: providerRole.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
