import { z } from 'zod';
import { createAction } from 'nango';

const MemberOperationValueSchema = z.object({
    email: z.string().describe('Email of the member to add or remove. Example: "jane@example.com"'),
    role: z.string().optional().describe('Member role. Required when adding a member. Example: "owner"')
});

const JsonPatchOperationSchema = z.discriminatedUnion('path', [
    z.object({
        op: z.literal('replace'),
        path: z.literal('/name'),
        value: z.string().describe('New workspace name. Example: "Marketing workspace"')
    }),
    z.object({
        op: z.enum(['add', 'remove']),
        path: z.literal('/members'),
        value: MemberOperationValueSchema
    })
]);

const InputSchema = z.object({
    workspace_id: z.string().describe('The workspace ID to update. Example: "wCjDgv"'),
    operations: z
        .array(JsonPatchOperationSchema)
        .describe(
            'JSON Patch operations Typeform supports for workspaces. Example: [{ op: "replace", path: "/name", value: "New name" }] or [{ op: "add", path: "/members", value: { email: "jane@example.com", role: "owner" } }]'
        )
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
