import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.string().describe('The unique identifier of the customer whose address is being retrieved.'),
        address_id: z.string().describe('The unique identifier of the customer address to retrieve.')
    })
    .describe('Input for retrieving a single customer address by ID.');

const ProviderCustomerAddressSchema = z.object({
    id: z.string(),
    customer_id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    def: z.boolean().nullable().optional(),
    address_type: z.union([z.string(), z.number()]).nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the customer address.'),
        customer_id: z.string().describe('The unique identifier of the customer this address belongs to.'),
        first_name: z.string().optional().describe('The first name associated with the address.'),
        last_name: z.string().optional().describe('The last name associated with the address.'),
        address1: z.string().optional().describe('The primary street address line.'),
        address2: z.string().optional().describe('The secondary street address line, such as apartment or suite number.'),
        city: z.string().optional().describe('The city name.'),
        province: z.string().optional().describe('The province or state name.'),
        country: z.string().optional().describe('The country name.'),
        zip: z.string().optional().describe('The postal or ZIP code.'),
        phone: z.string().optional().describe('The phone number associated with the address.'),
        company: z.string().optional().describe('The company name associated with the address.'),
        def: z.boolean().optional().describe('Whether this address is the default address for the customer.'),
        address_type: z.string().optional().describe('The type of address, such as residential or commercial.')
    })
    .describe('A single customer address retrieved from the provider.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single customer address from the provider without mutation.
 */
const action = createAction({
    description: 'Retrieve a single customer address by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/address/get-customer-address
            endpoint: `/admin/openapi/v20260601/customers/${encodeURIComponent(input.customer_id)}/addresses/${encodeURIComponent(input.address_id)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer address not found.',
                customer_id: input.customer_id,
                address_id: input.address_id
            });
        }

        const providerAddress = ProviderCustomerAddressSchema.parse(response.data.customer_address);

        return {
            id: providerAddress.id,
            customer_id: providerAddress.customer_id,
            ...(providerAddress.first_name != null && { first_name: providerAddress.first_name }),
            ...(providerAddress.last_name != null && { last_name: providerAddress.last_name }),
            ...(providerAddress.address1 != null && { address1: providerAddress.address1 }),
            ...(providerAddress.address2 != null && { address2: providerAddress.address2 }),
            ...(providerAddress.city != null && { city: providerAddress.city }),
            ...(providerAddress.province != null && { province: providerAddress.province }),
            ...(providerAddress.country != null && { country: providerAddress.country }),
            ...(providerAddress.zip != null && { zip: providerAddress.zip }),
            ...(providerAddress.phone != null && { phone: providerAddress.phone }),
            ...(providerAddress.company != null && { company: providerAddress.company }),
            ...(providerAddress.def != null && { def: providerAddress.def }),
            ...(providerAddress.address_type != null && { address_type: String(providerAddress.address_type) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
