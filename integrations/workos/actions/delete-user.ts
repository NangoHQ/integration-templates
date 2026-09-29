import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ user_id: z.string().min(1).describe('WorkOS user ID. Example: "user_01H..."') });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });

const action = createAction({
    description: 'Permanently delete a WorkOS user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://workos.com/docs/reference/user-management/user
            endpoint: `/user_management/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });
        return { id: input.user_id, success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
