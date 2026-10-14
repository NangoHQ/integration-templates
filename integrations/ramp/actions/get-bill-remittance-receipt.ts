import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bill_id: z.string().describe('The ID of a paid Ramp bill. Example: "79e87b94-b823-46f4-aed4-d05d9fc33463"')
    })
    .describe('Identifies the bill whose remittance receipt should be fetched.');

const SerializedBufferSchema = z.object({
    type: z.literal('Buffer'),
    data: z.array(z.number().int().min(0).max(255))
});

const OutputSchema = z
    .object({
        bill_id: z.string().describe('The ID of the bill the remittance receipt belongs to.'),
        content_type: z.string().describe('MIME type of the returned document, e.g. "application/pdf".'),
        file_name: z.string().optional().describe('Filename suggested by the provider, e.g. "remittance-receipt.pdf".'),
        file_size_bytes: z.number().describe('Size in bytes of the decoded PDF.'),
        content_base64: z.string().describe('Base64-encoded PDF contents of the remittance receipt.')
    })
    .describe('The bill remittance receipt as base64-encoded PDF bytes plus document metadata.');

/**
 * @tags: [read]
 * @tagReason: Fetches an existing paid bill's remittance receipt PDF without modifying any provider state.
 * @pitfalls: A receipt is only available once the bill's payment is completed, so open or unpaid bills fail with an error instead of returning an empty result.
 */
const action = createAction({
    description: 'Fetch the PDF remittance receipt for a paid bill.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/bills/{bill_id}/remittance-receipt)
            endpoint: `/developer/v1/bills/${encodeURIComponent(input.bill_id)}/remittance-receipt`,
            responseType: 'arraybuffer',
            retries: 3
        });

        const data: unknown = response.data;
        const serialized = SerializedBufferSchema.safeParse(data);
        let buffer: Buffer;
        if (Buffer.isBuffer(data)) {
            buffer = data;
        } else if (data instanceof ArrayBuffer) {
            buffer = Buffer.from(data);
        } else if (ArrayBuffer.isView(data)) {
            buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
        } else if (serialized.success) {
            buffer = Buffer.from(serialized.data.data);
        } else if (typeof data === 'string') {
            buffer = Buffer.from(data, 'binary');
        } else {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The remittance receipt response was not binary data.',
                bill_id: input.bill_id
            });
        }

        const rawContentType = response.headers['content-type'];
        const content_type = typeof rawContentType === 'string' ? rawContentType.split(';')[0]?.trim() || 'application/pdf' : 'application/pdf';

        const rawDisposition = response.headers['content-disposition'];
        let file_name: string | undefined;
        if (typeof rawDisposition === 'string') {
            const match = /filename="?([^";]+)"?/.exec(rawDisposition);
            if (match?.[1]) {
                file_name = match[1];
            }
        }

        return {
            bill_id: input.bill_id,
            content_type,
            ...(file_name !== undefined && { file_name }),
            file_size_bytes: buffer.byteLength,
            content_base64: buffer.toString('base64')
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
