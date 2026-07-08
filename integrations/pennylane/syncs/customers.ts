import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const V2AddressSchema = z.object({
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string()
});

const V2CustomerSchema = z.object({
    id: z.number(),
    customer_type: z.union([z.literal('company'), z.literal('individual')]),
    name: z.string(),
    external_reference: z.string(),
    billing_iban: z.string().nullable(),
    payment_conditions: z.string(),
    recipient: z.string(),
    phone: z.string(),
    reference: z.string().nullable(),
    notes: z.string().nullable(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    reg_no: z.string().optional(),
    vat_number: z.string().optional().nullable(),
    emails: z.string().array(),
    billing_address: V2AddressSchema,
    delivery_address: V2AddressSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const DeliveryAddressSchema = z.object({
    address: z.string().optional(),
    postal_code: z.union([z.string(), z.null()]).optional(),
    city: z.union([z.string(), z.null()]).optional(),
    country_alpha2: z.union([z.string(), z.null()]).optional()
});

const PennylaneCustomerSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    vat_number: z.union([z.string(), z.null()]).optional(),
    postal_code: z.union([z.string(), z.null()]).optional(),
    city: z.union([z.string(), z.null()]).optional(),
    country_alpha2: z.union([z.string(), z.null()]).optional(),
    recipient: z.union([z.string(), z.null()]).optional(),
    source_id: z.union([z.string(), z.null()]).optional(),
    emails: z.union([z.string().array(), z.null()]).optional(),
    billing_iban: z.union([z.string(), z.null()]).optional(),
    delivery_address: z.union([DeliveryAddressSchema, z.null()]).optional(),
    delivery_postal_code: z.union([z.string(), z.null()]).optional(),
    delivery_country_alpha2: z.union([z.string(), z.null()]).optional(),
    payment_conditions: z.union([z.string(), z.null()]).optional(),
    phone: z.union([z.string(), z.null()]).optional(),
    reference: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

type PennylaneCustomer = z.infer<typeof PennylaneCustomerSchema>;

function toCustomer(customer: z.infer<typeof V2CustomerSchema>): PennylaneCustomer {
    const billingAddress = customer.billing_address;
    const deliveryAddress = customer.delivery_address;
    const isIndividual = customer.customer_type === 'individual';

    return {
        id: customer.external_reference || String(customer.id),
        first_name: isIndividual ? customer.first_name : '',
        last_name: isIndividual ? customer.last_name : '',
        gender: '',
        address: billingAddress.address,
        vat_number: customer.vat_number ?? null,
        postal_code: billingAddress.postal_code,
        city: billingAddress.city,
        country_alpha2: billingAddress.country_alpha2,
        recipient: customer.recipient,
        source_id: customer.external_reference,
        emails: customer.emails,
        billing_iban: customer.billing_iban ?? '',
        delivery_address: {
            address: deliveryAddress.address,
            postal_code: deliveryAddress.postal_code,
            city: deliveryAddress.city,
            country_alpha2: deliveryAddress.country_alpha2
        },
        delivery_postal_code: deliveryAddress.postal_code || billingAddress.postal_code,
        delivery_country_alpha2: deliveryAddress.country_alpha2 || billingAddress.country_alpha2,
        payment_conditions: customer.payment_conditions,
        phone: customer.phone,
        reference: customer.reference ?? '',
        notes: customer.notes ?? ''
    };
}

const sync = createSync({
    description: 'Fetches a list of customers from pennylane',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['accounting'],
    models: {
        PennylaneCustomer: PennylaneCustomerSchema
    },
    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let cursor = checkpoint ? checkpoint['cursor'] : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcustomers.md
            endpoint: '/api/external/v2/customers',
            retries: 3,
            params: {
                limit: 2,
                ...(cursor ? { cursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 2,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const customers = page.map((item: unknown) => toCustomer(V2CustomerSchema.parse(item)));
            await nango.batchSave(customers, 'PennylaneCustomer');

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
