import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Okta user ID. Example: "00u14y5ppk7oVbg7r698"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Permanently delete a deactivated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/users/#delete-user
        await nango.delete({
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        return {
            id: input.userId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
