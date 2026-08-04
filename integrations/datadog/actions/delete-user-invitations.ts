import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().trim().min(1).describe('The UUID of the user whose pending invitations should be canceled. Example: "4dee724d-00cc-11ea-a77b-570c9d03c6c5"')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Revoke/delete all pending invitations for a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_invite'],

    exec: async (nango, input) => {
        await nango.delete({
            // https://docs.datadoghq.com/api/latest/users/#delete-a-pending-users-invitations
            endpoint: `v2/users/${encodeURIComponent(input.user_id)}/invitations`,
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
