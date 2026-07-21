import { z } from 'zod';
import { createAction } from 'nango';

const JsonPatchOperationSchema = z.object({
    op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
    path: z.string(),
    value: z.unknown().optional(),
    from: z.string().optional()
});

const InputSchema = z.object({
    workspace_id: z.string().describe('The workspace ID to update. Example: "wCjDgv"'),
    operations: z.array(JsonPatchOperationSchema).describe('JSON Patch operations per RFC 6902. Example: [{ op: "replace", path: "/name", value: "New name" }]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Partially update a workspace using JSON Patch operations',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.typeform.com/developers/create/
        await nango.patch({
            endpoint: `/workspaces/${encodeURIComponent(input.workspace_id)}`,
            data: input.operations,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
