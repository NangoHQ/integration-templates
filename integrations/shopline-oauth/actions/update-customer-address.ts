import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.string().describe('Customer ID. Example: "2791641345"'),
        address_id: z.string().describe('Address ID. Example: "1234567890"'),
        first_name: z.string().nullable().optional().describe('First name of the recipient. Pass null to clear.'),
        last_name: z.string().nullable().optional().describe('Last name of the recipient. Pass null to clear.'),
        company: z.string().nullable().optional().describe('Company name associated with the address. Pass null to clear.'),
        address1: z.string().nullable().optional().describe('Street address line 1. Pass null to clear.'),
        address2: z.string().nullable().optional().describe('Street address line 2. Pass null to clear.'),
        city: z.string().nullable().optional().describe('City name. Pass null to clear.'),
        province: z.string().nullable().optional().describe('Province or state name. Pass null to clear.'),
        country: z.string().nullable().optional().describe('Country name. Pass null to clear.'),
        zip: z.string().nullable().optional().describe('Postal or ZIP code. Pass null to clear.'),
        phone: z.string().nullable().optional().describe('Phone number associated with the address. Pass null to clear.'),
        country_code: z.string().nullable().optional().describe('ISO 3166-1 alpha-2 country code. Example: "US". Pass null to clear.'),
        province_code: z.string().nullable().optional().describe('Province or state code. Example: "NY". Pass null to clear.'),
        is_default: z.boolean().nullable().optional().describe('Whether this address is the default for the customer. Pass null to clear.')
    })
    .describe('Input for updating an existing customer address.');

const ProviderCustomerAddressSchema = z.object({
    id: z.string(),
    customer_id: z.string().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    province_code: z.string().nullable().optional(),
    is_default: z.boolean().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Address ID.'),
        customer_id: z.string().optional().describe('Customer ID.'),
        first_name: z.string().optional().describe('First name of the recipient.'),
        last_name: z.string().optional().describe('Last name of the recipient.'),
        company: z.string().optional().describe('Company name associated with the address.'),
        address1: z.string().optional().describe('Street address line 1.'),
        address2: z.string().optional().describe('Street address line 2.'),
        city: z.string().optional().describe('City name.'),
        province: z.string().optional().describe('Province or state name.'),
        country: z.string().optional().describe('Country name.'),
        zip: z.string().optional().describe('Postal or ZIP code.'),
        phone: z.string().optional().describe('Phone number associated with the address.'),
        country_code: z.string().optional().describe('ISO 3166-1 alpha-2 country code. Example: "US"'),
        province_code: z.string().optional().describe('Province or state code. Example: "NY"'),
        is_default: z.boolean().optional().describe('Whether this address is the default for the customer.')
    })
    .describe('The updated customer address.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing customer address via a PUT request.
 * @pitfalls: The provider silently ignores null values for address fields, so passing null does not clear them. The default-address flag is returned as `def` rather than `is_default` and is omitted from the output.
 */
const action = createAction({
    description: 'Update an existing customer address.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.first_name !== undefined) {
            body['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            body['last_name'] = input.last_name;
        }
        if (input.company !== undefined) {
            body['company'] = input.company;
        }
        if (input.address1 !== undefined) {
            body['address1'] = input.address1;
        }
        if (input.address2 !== undefined) {
            body['address2'] = input.address2;
        }
        if (input.city !== undefined) {
            body['city'] = input.city;
        }
        if (input.province !== undefined) {
            body['province'] = input.province;
        }
        if (input.country !== undefined) {
            body['country'] = input.country;
        }
        if (input.zip !== undefined) {
            body['zip'] = input.zip;
        }
        if (input.phone !== undefined) {
            body['phone'] = input.phone;
        }
        if (input.country_code !== undefined) {
            body['country_code'] = input.country_code;
        }
        if (input.province_code !== undefined) {
            body['province_code'] = input.province_code;
        }
        if (input.is_default !== undefined) {
            body['is_default'] = input.is_default;
        }

        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/addresses/update-customer-address
            endpoint: `/admin/openapi/v20260601/customers/${encodeURIComponent(input.customer_id)}/addresses/${encodeURIComponent(input.address_id)}.json`,
            data: {
                customer_address: body
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response body.'
            });
        }

        const ResponseSchema = z.object({
            customer_address: ProviderCustomerAddressSchema
        });

        const parsedResponse = ResponseSchema.parse(raw);
        const providerAddress = parsedResponse.customer_address;

        return {
            id: providerAddress.id,
            ...(providerAddress.customer_id !== undefined && { customer_id: providerAddress.customer_id }),
            ...(providerAddress.first_name != null && { first_name: providerAddress.first_name }),
            ...(providerAddress.last_name != null && { last_name: providerAddress.last_name }),
            ...(providerAddress.company != null && { company: providerAddress.company }),
            ...(providerAddress.address1 != null && { address1: providerAddress.address1 }),
            ...(providerAddress.address2 != null && { address2: providerAddress.address2 }),
            ...(providerAddress.city != null && { city: providerAddress.city }),
            ...(providerAddress.province != null && { province: providerAddress.province }),
            ...(providerAddress.country != null && { country: providerAddress.country }),
            ...(providerAddress.zip != null && { zip: providerAddress.zip }),
            ...(providerAddress.phone != null && { phone: providerAddress.phone }),
            ...(providerAddress.country_code != null && { country_code: providerAddress.country_code }),
            ...(providerAddress.province_code != null && { province_code: providerAddress.province_code }),
            ...(providerAddress.is_default != null && { is_default: providerAddress.is_default })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
