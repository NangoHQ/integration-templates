import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.string().describe('The ID of the order to update. Example: "DREk7wJcyXNHqULq8JJ2iPAsluJZY"'),
    version: z.number().int().describe('The current version of the order. Required to avoid VERSION_MISMATCH.'),
    order: z.object({}).passthrough().describe('Sparse order object containing only the fields to update.'),
    fields_to_clear: z.array(z.string()).optional().describe('Dot-notation paths of fields to clear. Example: ["discounts"]'),
    idempotency_key: z.string().optional().describe('A unique key for idempotency. Max length 192.')
});

const ProviderResponseSchema = z.object({
    order: z.object({}).passthrough().optional(),
    errors: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z
    .object({
        id: z.string().optional(),
        location_id: z.string().optional(),
        state: z.string().optional(),
        version: z.number().optional(),
        total_money: z
            .object({
                amount: z.number().optional(),
                currency: z.string().optional()
            })
            .optional(),
        line_items: z.array(z.object({}).passthrough()).optional(),
        discounts: z.array(z.object({}).passthrough()).optional(),
        service_charges: z.array(z.object({}).passthrough()).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update an order (e.g. add line items, discounts, service charges).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ORDERS_READ', 'ORDERS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            order: {
                version: input.version,
                ...input.order
            }
        };

        if (input.fields_to_clear !== undefined) {
            body['fields_to_clear'] = input.fields_to_clear;
        }

        if (input.idempotency_key !== undefined) {
            body['idempotency_key'] = input.idempotency_key;
        }

        // https://developer.squareup.com/reference/square/orders-api/update-order
        const response = await nango.put({
            endpoint: `/v2/orders/${encodeURIComponent(input.order_id)}`,
            data: body,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errors.map((e) => JSON.stringify(e)).join(', ')
            });
        }

        if (!providerResponse.order) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order not found or update failed.'
            });
        }

        return OutputSchema.parse(providerResponse.order);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
