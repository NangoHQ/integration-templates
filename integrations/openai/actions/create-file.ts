import { z } from 'zod';
import { createAction } from 'nango';

/**
 * Create File - OpenAI File Upload
 *
 * IMPORTANT: This action requires multipart/form-data file upload which cannot
 * be implemented in the Nango action sandbox (no fs access, binary handling limitations).
 *
 * Use the proxy script instead:
 *   openai/proxy/upload-file.ts
 *
 * API Docs: https://platform.openai.com/docs/api-reference/files/create
 */

const InputSchema = z.object({
    message: z.string().describe('Informational message about using the proxy script')
});

const OutputSchema = z.object({
    message: z.string(),
    proxyScript: z.string()
});

const action = createAction({
    description: 'Upload a file to OpenAI. Must be implemented as a proxy script, not an action, due to multipart/form-data requirements.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file.write'],

    exec: async (_nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        return {
            message:
                'This endpoint requires multipart/form-data upload and cannot be implemented as a Nango action. Please use the proxy script at openai/proxy/upload-file.ts.',
            proxyScript: 'openai/proxy/upload-file.ts'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
