import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the customer to retrieve. Example: "cus_123"')
});

const AddressSchema = z
    .object({
        city: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        line1: z.string().nullable().optional(),
        line2: z.string().nullable().optional(),
        postal_code: z.string().nullable().optional(),
        state: z.string().nullable().optional()
    })
    .passthrough();

const InvoiceSettingsSchema = z
    .object({
        custom_fields: z
            .array(
                z.object({
                    name: z.string(),
                    value: z.string()
                })
            )
            .nullable()
            .optional(),
        default_payment_method: z.string().nullable().optional(),
        footer: z.string().nullable().optional(),
        rendering_options: z.unknown().nullable().optional()
    })
    .passthrough();

const ShippingSchema = z
    .object({
        address: AddressSchema.nullable().optional(),
        name: z.string().optional(),
        phone: z.string().nullable().optional()
    })
    .passthrough();

const CustomerSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        address: AddressSchema.nullable().optional(),
        balance: z.number().optional(),
        created: z.number().optional(),
        currency: z.string().nullable().optional(),
        default_source: z.string().nullable().optional(),
        delinquent: z.boolean().nullable().optional(),
        description: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        invoice_settings: InvoiceSettingsSchema.optional(),
        livemode: z.boolean().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
        name: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        preferred_locales: z.array(z.string()).nullable().optional(),
        shipping: ShippingSchema.nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single customer from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-customer',
        group: 'Customers'
    },
    input: InputSchema,
    output: CustomerSchema,
    scopes: ['read_only'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://docs.stripe.com/api/customers/retrieve
            endpoint: `/v1/customers/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found',
                id: input.id
            });
        }

        const customer = CustomerSchema.parse(response.data);
        return customer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
