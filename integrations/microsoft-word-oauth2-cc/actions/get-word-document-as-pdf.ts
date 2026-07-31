import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Item (driveItem) ID. Example: "01RFYLAYGCHWM67HNJIZBJNCQTFNXT6YGT"')
});

const OutputSchema = z.object({
    content: z.string().describe('PDF content as a base64-encoded string'),
    contentType: z.string().optional().describe('Content-Type header value from the response'),
    size: z.number().describe('Size of the PDF content in bytes')
});

const action = createAction({
    description: 'Download a Word document converted to PDF',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-get-content
        const response = await nango.get({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`,
            params: {
                format: 'pdf'
            },
            responseType: 'arraybuffer',
            retries: 3
        });

        const data: unknown = response.data;
        let buffer: Buffer;
        if (Buffer.isBuffer(data)) {
            buffer = data;
        } else if (data instanceof ArrayBuffer) {
            buffer = Buffer.from(data);
        } else if (typeof data === 'object' && data !== null && 'data' in data && Array.isArray(data.data)) {
            const numbers = data.data.map((value: unknown) => Number(value));
            buffer = Buffer.from(numbers);
        } else {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected binary response but received unexpected type',
                driveId: input.driveId,
                itemId: input.itemId
            });
        }

        const contentType = typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : 'application/pdf';

        return {
            content: buffer.toString('base64'),
            contentType,
            size: buffer.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
