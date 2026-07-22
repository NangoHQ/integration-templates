import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    idOrName: z.string().describe('Project ID or name. Example: "prj_abc123" or "my-project"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://vercel.com/docs/rest-api/reference
        await nango.delete({
            endpoint: `/v9/projects/${encodeURIComponent(input.idOrName)}`,
            retries: 1
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
