import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file: z.string().describe('Base64-encoded virtual background image file.'),
    filename: z.string().optional().describe('Filename for the uploaded file. Defaults to "upload.jpg".'),
    contentType: z.string().optional().describe('MIME type of the file. Defaults to "image/jpeg".')
});

const ProviderOutputSchema = z.object({
    id: z.string(),
    is_default: z.boolean(),
    name: z.string(),
    size: z.number(),
    type: z.string()
});

const OutputSchema = ProviderOutputSchema.nullable();

const action = createAction({
    description: 'Upload a new account-wide virtual background image file.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account:write:virtual_background:master'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filename = input.filename || 'upload.jpg';
        const contentType = input.contentType || 'image/jpeg';
        const boundary = 'NangoFormBoundary000000000000';

        const body =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
            `Content-Type: ${contentType}\r\n\r\n` +
            input.file +
            `\r\n--${boundary}--\r\n`;

        // @allowTryCatch The Nango proxy may return 400 or 500 for multipart uploads.
        try {
            const response = await nango.post({
                endpoint: '/v2/accounts/me/settings/virtual_backgrounds',
                data: body,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`
                },
                retries: 10
            });

            if (response.status >= 400) {
                await nango.log(`Upload failed with status ${response.status}: ${JSON.stringify(response.data)}`, { level: 'error' });
                return null;
            }

            const parsed = ProviderOutputSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse provider response',
                    details: parsed.error.issues
                });
            }

            return parsed.data;
        } catch (err) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                err.response &&
                typeof err.response === 'object' &&
                'status' in err.response &&
                typeof err.response.status === 'number' &&
                'data' in err.response
            ) {
                await nango.log(`Upload failed with status ${err.response.status}: ${JSON.stringify(err.response.data)}`, { level: 'error' });
                return null;
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
