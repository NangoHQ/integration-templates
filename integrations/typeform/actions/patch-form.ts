import { z } from 'zod';
import { createAction } from 'nango';

const JsonPatchOperationSchema = z.object({
    op: z.string().describe('Operation type. Example: "replace"'),
    path: z.string().describe('JSON Pointer path. Example: "/title"'),
    value: z.unknown().optional().describe('New value for the operation')
});

const InputSchema = z.object({
    form_id: z.string().describe('Form ID. Example: "WMpBq4vc"'),
    operations: z.array(JsonPatchOperationSchema).describe('JSON Patch operations array per RFC 6902')
});

const OutputSchema = z.object({
    success: z.boolean(),
    form_id: z.string()
});

const action = createAction({
    description: 'Partially update a form using JSON Patch operations',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['forms:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.typeform.com/developers/create/
        await nango.patch({
            endpoint: `/forms/${encodeURIComponent(input.form_id)}`,
            data: input.operations,
            retries: 3
        });

        return {
            success: true,
            form_id: input.form_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
