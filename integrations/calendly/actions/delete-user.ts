import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Organization membership UUID to remove')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Remove a user from the Calendly organization.',
    version: '2.1.0',
    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/ce7440ed9da47-remove-user-from-organization
        await nango.delete({
            endpoint: `/organization_memberships/${input.id}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
