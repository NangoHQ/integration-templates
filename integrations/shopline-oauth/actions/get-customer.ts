import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the customer. Example: "2791641345"')
    })
    .describe('Input to retrieve a single customer by ID.');

const ProviderCustomerAddressSchema = z.object({
    id: z.string().optional(),
    customer_id: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    province_code: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    country_name: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().nullable().optional(),
    name: z.string().optional(),
    default: z.boolean().optional()
});

const CustomerAddressSchema = z.object({
    id: z.string().optional().describe('Unique identifier for the address.'),
    customer_id: z.string().optional().describe('ID of the customer this address belongs to.'),
    address1: z.string().optional().describe('First line of the street address.'),
    address2: z.string().optional().describe('Second line of the street address.'),
    city: z.string().optional().describe('City name.'),
    province: z.string().optional().describe('Province or state name.'),
    province_code: z.string().optional().describe('ISO code for the province or state.'),
    country: z.string().optional().describe('Country name.'),
    country_code: z.string().optional().describe('ISO code for the country.'),
    country_name: z.string().optional().describe('Human-readable country name.'),
    zip: z.string().optional().describe('Postal or ZIP code.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    name: z.string().optional().describe('Full name associated with the address.'),
    default: z.boolean().optional().describe("Whether this is the customer's default address.")
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    state: z.number().optional(),
    addresses: z.array(ProviderCustomerAddressSchema).nullable().optional(),
    default_address: ProviderCustomerAddressSchema.nullable().optional(),
    email_marketing_consent: z.object({}).passthrough().nullable().optional(),
    sms_marketing_consent: z.object({}).passthrough().nullable().optional(),
    orders_count: z.number().nullable().optional(),
    total_spent: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const CustomerSchema = z
    .object({
        id: z.string().describe('Unique identifier for the customer.'),
        email: z.string().optional().describe('Customer email address.'),
        first_name: z.string().optional().describe('Customer first name.'),
        last_name: z.string().optional().describe('Customer last name.'),
        phone: z.string().optional().describe('Customer phone number.'),
        state: z.number().optional().describe('Customer account state.'),
        addresses: z.array(CustomerAddressSchema).optional().describe('List of customer addresses.'),
        default_address: CustomerAddressSchema.optional().describe("The customer's default address."),
        email_marketing_consent: z.object({}).passthrough().optional().describe('Email marketing consent settings.'),
        sms_marketing_consent: z.object({}).passthrough().optional().describe('SMS marketing consent settings.'),
        orders_count: z.number().optional().describe('Total number of orders placed by the customer.'),
        total_spent: z.string().optional().describe('Total amount spent by the customer.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the customer was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the customer was last updated.')
    })
    .describe('A single customer record from the SHOPLINE store.');

const OutputSchema = CustomerSchema;

const ProviderResponseSchema = z.object({
    customer: ProviderCustomerSchema
});

function normalizeAddress(addr: z.infer<typeof ProviderCustomerAddressSchema> | null | undefined): z.infer<typeof CustomerAddressSchema> | undefined {
    if (!addr) {
        return undefined;
    }
    return {
        id: addr.id,
        customer_id: addr.customer_id,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        province: addr.province,
        province_code: addr.province_code,
        country: addr.country,
        country_code: addr.country_code,
        country_name: addr.country_name,
        zip: addr.zip,
        phone: addr.phone ?? undefined,
        name: addr.name,
        default: addr.default
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads a single customer record from the provider by ID.
 * @pitfalls: The provider returns per-address first_name, last_name, and company fields that are not exposed in the output, so the documented name field may be omitted and company details are lost.
 */
const action = createAction({
    description: 'Retrieve a single customer by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer-information/get-a-customer
            endpoint: `/admin/openapi/v20260601/customers/v2/${encodeURIComponent(input.id)}.json`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const customer = parsed.customer;

        return {
            id: customer.id,
            email: customer.email ?? undefined,
            first_name: customer.first_name ?? undefined,
            last_name: customer.last_name ?? undefined,
            phone: customer.phone ?? undefined,
            state: customer.state,
            addresses: customer.addresses?.map(normalizeAddress).filter((a): a is z.infer<typeof CustomerAddressSchema> => a !== undefined),
            default_address: normalizeAddress(customer.default_address),
            email_marketing_consent: customer.email_marketing_consent ?? undefined,
            sms_marketing_consent: customer.sms_marketing_consent ?? undefined,
            orders_count: customer.orders_count ?? undefined,
            total_spent: customer.total_spent ?? undefined,
            created_at: customer.created_at ?? undefined,
            updated_at: customer.updated_at ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
