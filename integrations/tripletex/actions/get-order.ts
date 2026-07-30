import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Order ID. Example: 210311950')
});

const ProviderOrderSchema = z
    .object({
        id: z.number(),
        version: z.number().optional(),
        number: z.string().optional().nullable(),
        orderDate: z.string().optional().nullable(),
        deliveryDate: z.string().optional().nullable(),
        customer: z
            .object({
                id: z.number(),
                name: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        orderLines: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        preliminaryInvoice: z
            .object({
                id: z.number(),
                url: z.string().optional().nullable()
            })
            .optional()
            .nullable()
    })
    .passthrough();

const OutputSchema = ProviderOrderSchema;

const action = createAction({
    description: 'Retrieve an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: `v2/order/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order not found',
                orderId: input.id
            });
        }

        const rawData =
            typeof response.data === 'object' && response.data !== null && 'value' in response.data && response.data.value !== undefined
                ? response.data.value
                : response.data;

        const providerOrder = ProviderOrderSchema.parse(rawData);

        return providerOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
