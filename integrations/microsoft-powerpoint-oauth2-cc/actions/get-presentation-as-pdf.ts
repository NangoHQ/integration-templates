import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Item ID of the presentation. Example: "01RFYLAYBX27CGEGAJH5HZMVYI6Y3NGGYJ"')
});

const OutputSchema = z.object({
    content: z.string().describe('Base64-encoded PDF content'),
    contentType: z.string().optional(),
    size: z.number().optional()
});

const action = createAction({
    description: 'Download a presentation converted to PDF',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`,
            params: {
                format: 'pdf'
            },
            retries: 3
        });

        const rawData: unknown = response.data;
        let buffer: Buffer;

        if (Buffer.isBuffer(rawData)) {
            buffer = rawData;
        } else if (typeof rawData === 'string') {
            buffer = Buffer.from(rawData, 'binary');
        } else if (rawData instanceof ArrayBuffer) {
            buffer = Buffer.from(rawData);
        } else {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an unexpected response format for PDF content.'
            });
        }

        const contentTypeHeader = response.headers['content-type'];
        const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : 'application/pdf';

        return {
            content: buffer.toString('base64'),
            contentType,
            size: buffer.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
