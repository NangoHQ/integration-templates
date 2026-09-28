import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ connection_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a WorkOS SSO connection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://workos.com/docs/reference/sso/connection
            endpoint: `/connections/${encodeURIComponent(input.connection_id)}`,
            retries: 3
        });
        return { id: input.connection_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
