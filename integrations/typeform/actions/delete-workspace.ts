import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_id: z.string().describe('Workspace ID to delete. Example: "BFvknD"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    workspace_id: z.string()
});

const action = createAction({
    description: 'Delete a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.typeform.com/developers/create/
        await nango.delete({
            endpoint: `/workspaces/${encodeURIComponent(input.workspace_id)}`,
            retries: 3
        });

        return {
            success: true,
            workspace_id: input.workspace_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
