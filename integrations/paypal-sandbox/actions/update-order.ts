import { z } from 'zod';
import { createAction } from 'nango';

const PatchOperationSchema = z.object({
    op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
    path: z.string(),
    value: z.unknown().optional()
});

const InputSchema = z.object({
    id: z.string().describe('Order ID. Example: "8A79039013362943U"'),
    patch: z.array(PatchOperationSchema).describe('JSON Patch operations (RFC 6902).')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Update an order with a JSON Patch before it is captured or authorized (e.g. amount, description, shipping address)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.patch({
            // https://developer.paypal.com/api/rest/
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.id)}`,
            data: input.patch,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
