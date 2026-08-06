import { z } from 'zod';
import { createAction } from 'nango';

/**
 * Upload Virtual Background File - Zoom
 *
 * IMPORTANT: This endpoint requires a multipart/form-data upload. Nango's action sandbox proxies
 * requests through a JSON-based transport that cannot preserve a real multipart body end-to-end
 * (confirmed live: both a manually constructed multipart body and a FormData/Blob body sent via
 * nango.post() reach Zoom with the file part missing or the request not recognized as multipart).
 *
 * Use the proxy script instead:
 *   zoom-cc/proxy/upload-virtual-background-file.ts
 *
 * API Docs: https://developers.zoom.us/docs/api/accounts/#tag/accounts/POST/accounts/{accountId}/settings/virtual_backgrounds
 */

const InputSchema = z.object({
    message: z.string().describe('Informational message about using the proxy script')
});

const OutputSchema = z.object({
    message: z.string(),
    proxyScript: z.string()
});

const action = createAction({
    description:
        'Upload a new account-wide virtual background image file. Must be implemented as a proxy script, not an action, due to multipart/form-data requirements.',
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account:write:virtual_background_files:master', 'account:write:virtual_background_files:admin'],

    exec: async (_nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        return {
            message:
                'This endpoint requires a multipart/form-data upload and cannot be implemented as a Nango action. Please use the proxy script at zoom-cc/proxy/upload-virtual-background-file.ts.',
            proxyScript: 'zoom-cc/proxy/upload-virtual-background-file.ts'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
