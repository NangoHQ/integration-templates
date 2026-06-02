import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileName: z.string().describe('The display name for the uploaded file. Example: "handbook.pdf"'),
    categoryId: z.number().describe('The ID of the file category (section) to upload the file into. Example: 123'),
    share: z.enum(['yes', 'no']).optional().describe('Whether to share the file with all employees. Defaults to "no".'),
    fileContentBase64: z.string().describe('Base64-encoded file content.'),
    mimeType: z.string().optional().describe('MIME type of the file. Defaults to "application/octet-stream".')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the newly created company file.'),
    location: z.string().optional().describe('The URL of the new file resource.')
});

const action = createAction({
    description: 'Create a company file in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-company-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const subdomain =
            connection !== null &&
            typeof connection === 'object' &&
            'connection_config' in connection &&
            connection.connection_config !== null &&
            typeof connection.connection_config === 'object' &&
            'subdomain' in connection.connection_config &&
            typeof connection.connection_config['subdomain'] === 'string'
                ? connection.connection_config['subdomain']
                : null;

        if (!subdomain) {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'BambooHR subdomain not found in connection config.'
            });
        }

        const token = await nango.getToken();
        const accessToken =
            token !== null && typeof token === 'object' && 'access_token' in token && typeof token.access_token === 'string'
                ? token.access_token
                : String(token);

        const boundary = 'NangoFormBoundary' + Math.random().toString(36).substring(2);
        const mimeType = input.mimeType || 'application/octet-stream';
        const fileBuffer = Buffer.from(input.fileContentBase64, 'base64');

        const preData = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\n${input.fileName}\r\n` +
                `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\n${input.categoryId}\r\n` +
                (input.share !== undefined ? `--${boundary}\r\nContent-Disposition: form-data; name="share"\r\n\r\n${input.share}\r\n` : '') +
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${input.fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
            'utf8'
        );
        const postData = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
        const body = Buffer.concat([preData, fileBuffer, postData]);

        const url = new URL(`https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(subdomain)}/v1/files`);

        // https://documentation.bamboohr.com/reference/upload-company-file
        const response = await nango.uncontrolledFetch({
            url,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body.toString('binary')
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new nango.ActionError({
                type: 'upload_failed',
                message: `File upload failed: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }

        const locationHeader = response.headers.get('location') || response.headers.get('Location');
        if (typeof locationHeader !== 'string') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Location header missing from upload response'
            });
        }

        const locationUrl = new URL(locationHeader, 'https://example.com');
        const pathname = locationUrl.pathname || '';
        const pathParts = pathname.split('/');
        const fileId = pathParts[pathParts.length - 1];

        if (!fileId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Could not extract file ID from Location header'
            });
        }

        return {
            id: fileId,
            location: locationHeader
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
