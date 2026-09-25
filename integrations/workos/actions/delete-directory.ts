import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ directory_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a WorkOS directory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://workos.com/docs/reference/directory-sync/directory
            endpoint: `/directories/${encodeURIComponent(input.directory_id)}`,
            retries: 3
        });
        return { id: input.directory_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
