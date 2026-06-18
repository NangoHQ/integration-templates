import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The ID of the employee whose file is being retrieved. Use "0" to resolve to the employee associated with the API key.'),
    fileId: z.string().describe('The ID of the employee file to download.')
});

const OutputSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    content: z.string().describe('Base64-encoded file content.'),
    contentType: z.string().describe('MIME type of the file.'),
    filename: z.string().describe('Original filename from Content-Disposition header.'),
    size: z.number().describe('Size of the file in bytes.')
});

const action = createAction({
    description: 'Retrieve a single file from an employee record in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-employee-file
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/files/${encodeURIComponent(input.fileId)}`,
            retries: 3,
            responseType: 'arraybuffer'
        });

        const raw: unknown = response.data;
        let buffer: Buffer;

        if (Buffer.isBuffer(raw)) {
            buffer = raw;
        } else if (raw instanceof ArrayBuffer) {
            buffer = Buffer.from(raw);
        } else if (typeof raw === 'string') {
            buffer = Buffer.from(raw, 'binary');
        } else if (
            typeof raw === 'object' &&
            raw !== null &&
            'type' in raw &&
            'data' in raw &&
            raw.type === 'Buffer' &&
            Array.isArray(raw.data) &&
            raw.data.every((item: unknown) => typeof item === 'number')
        ) {
            buffer = Buffer.from(raw.data);
        } else {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response data type from file download'
            });
        }

        const rawContentType = response.headers['content-type'];
        const contentType = typeof rawContentType === 'string' ? rawContentType : 'application/octet-stream';

        const rawContentDisposition = response.headers['content-disposition'];
        const contentDisposition = typeof rawContentDisposition === 'string' ? rawContentDisposition : '';

        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch !== null && filenameMatch[1] !== undefined ? filenameMatch[1] : 'unknown';

        return {
            id: input.fileId,
            employeeId: input.employeeId,
            content: buffer.toString('base64'),
            contentType,
            filename,
            size: buffer.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
