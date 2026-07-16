import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.string().describe('The ID of the order to update. Example: "DREk7wJcyXNHqULq8JJ2iPAsluJZY"'),
    version: z.number().int().describe('The current version of the order. Required to avoid VERSION_MISMATCH.'),
    order: z.object({}).passthrough().describe('Sparse order object containing only the fields to update.'),
    fields_to_clear: z.array(z.string()).optional().describe('Dot-notation paths of fields to clear. Example: ["discounts"]'),
    idempotency_key: z
        .string()
        .max(192)
        .optional()
        .describe('A unique key for this request. If omitted, a random UUID is generated so retries are always safe.')
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
        // input.order may itself contain a (possibly stale) `version` field, e.g. when a caller
        // passes back a full order object it fetched earlier. Spread it FIRST so the explicit,
        // caller-supplied input.version always wins and can't be silently clobbered.
        const body: Record<string, unknown> = {
            order: {
                ...input.order,
                version: input.version
            }
        };

        if (input.fields_to_clear !== undefined) {
            body['fields_to_clear'] = input.fields_to_clear;
        }

        // Without an idempotency_key, a request that Square already applied (e.g. after a client
        // timeout) can return 200 with the UNCHANGED order on retry, making the caller believe the
        // update happened when it silently didn't. Generate one when absent so retries default-safe.
        body['idempotency_key'] = input.idempotency_key ?? randomUUID();

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
