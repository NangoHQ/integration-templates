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
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/roles/delete-roles
        // nango.delete() throws on non-2xx, so reaching here means success.
        await nango.delete({
            endpoint: `/api/v2/roles/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
