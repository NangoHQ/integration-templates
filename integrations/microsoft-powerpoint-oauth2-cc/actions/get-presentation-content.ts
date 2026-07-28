import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Item ID. Example: "01RFYLAYBX27CGEGAJH5HZMVYI6Y3NGGYJ"')
});

const OutputSchema = z.object({
    content: z.string().describe('Base64-encoded .pptx content')
});

const action = createAction({
    description: 'Download the raw .pptx content of a presentation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-get-content
        const response = await nango.get({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`,
            responseType: 'arraybuffer',
            retries: 3
        });

        const raw = response.data;
        if (raw == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Presentation content not found.'
            });
        }
        if (typeof raw === 'string') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected binary content but received text.'
            });
        }
        if (Array.isArray(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected binary content but received an array.'
            });
        }

        const buffer = Buffer.from(raw);
        const content = buffer.toString('base64');

        return {
            content
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
