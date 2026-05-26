import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe("Pagination cursor from the previous response. Maps to Stripe's starting_after. Omit for the first page."),
    email: z.string().optional().describe('A case-sensitive filter on the list based on the customer email field.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.'),
    created_after: z.number().int().optional().describe('Only return customers that were created after this Unix timestamp. Maps to created[gte].'),
    created_before: z.number().int().optional().describe('Only return customers that were created before this Unix timestamp. Maps to created[lte].')
});

const CustomerSchema = z
    .object({
        id: z.string(),
        object: z.literal('customer'),
        address: z
            .object({
                city: z.string().optional(),
                country: z.string().optional(),
                line1: z.string().optional(),
                line2: z.string().optional(),
                postal_code: z.string().optional(),
                state: z.string().optional()
            })
            .nullable()
            .optional(),
        balance: z.number().optional(),
        created: z.number().optional(),
        currency: z.string().nullable().optional(),
        default_source: z.string().nullable().optional(),
        delinquent: z.boolean().optional(),
        description: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        invoice_prefix: z.string().optional(),
        invoice_settings: z
            .object({
                custom_fields: z.unknown().nullable().optional(),
                default_payment_method: z.string().nullable().optional(),
                footer: z.string().nullable().optional(),
                rendering_options: z.unknown().nullable().optional()
            })
            .optional(),
        livemode: z.boolean().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
        name: z.string().nullable().optional(),
        next_invoice_sequence: z.number().optional(),
        phone: z.string().nullable().optional(),
        preferred_locales: z.array(z.string()).optional(),
        shipping: z
            .object({
                address: z
                    .object({
                        city: z.string().optional(),
                        country: z.string().optional(),
                        line1: z.string().optional(),
                        line2: z.string().optional(),
                        postal_code: z.string().optional(),
                        state: z.string().optional()
                    })
                    .optional(),
                name: z.string().optional(),
                phone: z.string().optional()
            })
            .nullable()
            .optional(),
        tax_exempt: z.enum(['none', 'exempt', 'reverse']).optional(),
        test_clock: z.string().nullable().optional()
    })
    .passthrough();

const ListResponseSchema = z.object({
    object: z.literal('list'),
    url: z.string().optional(),
    has_more: z.boolean(),
    data: z.array(CustomerSchema)
});

const OutputSchema = z.object({
    items: z.array(CustomerSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customers from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-customers',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            params['starting_after'] = input.cursor;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.created_after !== undefined) {
            params['created[gte]'] = input.created_after;
        }
        if (input.created_before !== undefined) {
            params['created[lte]'] = input.created_before;
        }

        // https://docs.stripe.com/api/customers/list
        const response = await nango.get({
            endpoint: '/v1/customers',
            params,
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.data;
        const lastItem = items.length > 0 ? items[items.length - 1] : undefined;
        const nextCursor = listResponse.has_more && lastItem !== undefined ? lastItem.id : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
