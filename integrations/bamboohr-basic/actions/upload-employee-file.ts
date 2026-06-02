import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('Employee ID. Example: "123"'),
    fileName: z.string().describe('The display name for the uploaded file. Example: "document.pdf"'),
    categoryId: z.number().int().describe('The ID of the employee file section to upload the file into.'),
    share: z.enum(['yes', 'no']).optional().describe('Whether to share the file with the employee. Defaults to "no".'),
    fileContent: z.string().describe('Base64-encoded file content.')
});

const OutputSchema = z.object({
    fileUrl: z.string().describe('URL of the newly created file resource from the Location header.')
});

const action = createAction({
    description: 'Upload a file to an employee record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-employee-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['employee:file.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fileBuffer = Buffer.from(input.fileContent, 'base64');
        const boundary = '----NangoBoundary' + randomBytes(16).toString('hex');

        const textParts = [
            `Content-Disposition: form-data; name="category"\r\n\r\n${input.categoryId}`,
            `Content-Disposition: form-data; name="fileName"\r\n\r\n${input.fileName}`,
            ...(input.share !== undefined ? [`Content-Disposition: form-data; name="share"\r\n\r\n${input.share}`] : [])
        ];

        const preFile = Buffer.from(
            textParts.map((part) => `--${boundary}\r\n${part}\r\n`).join('') +
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${input.fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
            'utf-8'
        );

        const postFile = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');

        const body = Buffer.concat([preFile, fileBuffer, postFile]);

        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        const accessToken =
            credentials && typeof credentials === 'object' && 'access_token' in credentials && typeof credentials.access_token === 'string'
                ? credentials.access_token
                : '';

        if (!accessToken || accessToken.length === 0) {
            throw new nango.ActionError({
                type: 'missing_access_token',
                message: 'Unable to retrieve a valid access token for the BambooHR connection.'
            });
        }

        const subdomain = connection.connection_config?.['subdomain'];
        if (typeof subdomain !== 'string' || subdomain.length === 0) {
            throw new nango.ActionError({
                type: 'missing_subdomain',
                message: 'BambooHR subdomain is missing from the connection config.'
            });
        }

        const url = new URL(
            `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(subdomain)}/v1/employees/${encodeURIComponent(input.employeeId)}/files`
        );

        // https://documentation.bamboohr.com/reference/upload-employee-file
        const fetchResponse = await nango.uncontrolledFetch({
            url,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body.toString('binary')
        });

        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            throw new nango.ActionError({
                type: 'upload_failed',
                message: `Upload failed: ${fetchResponse.status} ${fetchResponse.statusText}`,
                details: errorText
            });
        }

        const locationHeader = fetchResponse.headers.get('location');
        if (typeof locationHeader !== 'string' || locationHeader.length === 0) {
            throw new nango.ActionError({
                type: 'missing_location_header',
                message: 'File uploaded successfully but Location header is missing.'
            });
        }

        return {
            fileUrl: locationHeader
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
