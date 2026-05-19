import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file: z.string().describe('Base64-encoded file content. Example: "dGVzdCBjb250ZW50"'),
    filename: z.string().describe('Name of the file. Example: "training_data.jsonl"'),
    purpose: z.enum(['assistants', 'batch', 'fine-tune', 'vision']).describe('Purpose of the file. One of: assistants, batch, fine-tune, vision')
});

const OutputSchema = z.object({
    id: z.string(),
    bytes: z.number(),
    created_at: z.number(),
    filename: z.string(),
    purpose: z.enum(['assistants', 'batch', 'fine-tune', 'vision']),
    status: z.enum(['uploaded', 'processed', 'error']).optional(),
    status_details: z.string().optional()
});

const action = createAction({
    description: 'Upload a file to OpenAI',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Decode base64 to validate input format
        // @allowTryCatch: Buffer.from may throw on invalid base64 input
        try {
            Buffer.from(input.file, 'base64');
        } catch {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid base64-encoded file content'
            });
        }

        // https://platform.openai.com/docs/api-reference/files/create
        // Note: This endpoint requires multipart/form-data which cannot be implemented as a Nango action.
        // The OpenAI /v1/files endpoint requires multipart/form-data encoding for file uploads,
        // which is not supported in the Nango action runtime environment.
        // Use the proxy script at openai/proxy/upload-file.ts for actual file uploads.
        throw new nango.ActionError({
            type: 'not_implemented',
            message:
                'File uploads require multipart/form-data and cannot be implemented as a Nango action. Please use the proxy script at openai/proxy/upload-file.ts for file uploads.',
            proxy_script: 'openai/proxy/upload-file.ts'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
