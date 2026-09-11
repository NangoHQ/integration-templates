import { z } from 'zod';
import { createAction } from 'nango';
const InputSchema = z.object({ user_id: z.string().min(1) });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a Clerk user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://clerk.com/docs/reference/backend-api/tag/Users#operation/DeleteUser
        await nango.delete({ endpoint: `/v1/users/${encodeURIComponent(input.user_id)}`, retries: 3 });
        return { id: input.user_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
