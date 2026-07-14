import { z } from 'zod';
import { createAction } from 'nango';

const PatchOperationSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), path: z.string(), value: z.unknown() }),
    z.object({ op: z.literal('replace'), path: z.string(), value: z.unknown() }),
    z.object({ op: z.literal('test'), path: z.string(), value: z.unknown() }),
    z.object({ op: z.literal('remove'), path: z.string() }),
    z.object({ op: z.literal('move'), path: z.string(), from: z.string() }),
    z.object({ op: z.literal('copy'), path: z.string(), from: z.string() })
]);

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
