import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the role to delete. Example: "rol_abc123"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a role in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-role',
        group: 'Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/roles/delete-roles
        const response = await nango.delete({
            endpoint: `/api/v2/roles/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Role with id "${input.id}" was not found.`,
                id: input.id
            });
        }

        return {
            id: input.id,
            success: response.status >= 200 && response.status < 300
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
