import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.string().describe('The unique identifier of the customer to add the address to. Example: "2791747437"'),
        address1: z.string().describe('The first line of the street address.'),
        first_name: z.string().optional().describe('The first name associated with the address.'),
        last_name: z.string().optional().describe('The last name associated with the address.'),
        address2: z.string().optional().describe('The second line of the street address.'),
        phone: z.string().optional().describe('The phone number associated with the address.'),
        company: z.string().optional().describe('The company name associated with the address.'),
        country: z.string().optional().describe('The country name of the address.'),
        country_code: z.string().optional().describe('The ISO country code of the address.'),
        province: z.string().optional().describe('The province or state name of the address.'),
        province_code: z.string().optional().describe('The province or state code of the address.'),
        city: z.string().optional().describe('The city name of the address.'),
        city_code: z.string().optional().describe('The city code of the address.'),
        district: z.string().optional().describe('The district name of the address.'),
        district_code: z.string().optional().describe('The district code of the address.'),
        town: z.string().optional().describe('The town name of the address.'),
        zip: z.string().optional().describe('The postal or ZIP code of the address.'),
        def: z.boolean().optional().describe('Whether this address is the default address for the customer.'),
        address_type: z.string().optional().describe('The type of address (e.g., home, work).')
    })
    .describe('Input for adding a new address to a customer.');

const ProviderCustomerAddressSchema = z
    .object({
        id: z.string(),
        customer_id: z.string().optional(),
        address1: z.string().optional().nullable(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        address2: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        country_code: z.string().optional().nullable(),
        province: z.string().optional().nullable(),
        province_code: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        city_code: z.string().optional().nullable(),
        district: z.string().optional().nullable(),
        district_code: z.string().optional().nullable(),
        town: z.string().optional().nullable(),
        zip: z.string().optional().nullable(),
        def: z.boolean().optional().nullable(),
        address_type: z.union([z.string(), z.number()]).optional().nullable()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created address.'),
        customer_id: z.string().describe('The unique identifier of the customer this address belongs to.'),
        address1: z.string().optional().describe('The first line of the street address.'),
        first_name: z.string().optional().describe('The first name associated with the address.'),
        last_name: z.string().optional().describe('The last name associated with the address.'),
        address2: z.string().optional().describe('The second line of the street address.'),
        phone: z.string().optional().describe('The phone number associated with the address.'),
        company: z.string().optional().describe('The company name associated with the address.'),
        country: z.string().optional().describe('The country name of the address.'),
        country_code: z.string().optional().describe('The ISO country code of the address.'),
        province: z.string().optional().describe('The province or state name of the address.'),
        province_code: z.string().optional().describe('The province or state code of the address.'),
        city: z.string().optional().describe('The city name of the address.'),
        city_code: z.string().optional().describe('The city code of the address.'),
        district: z.string().optional().describe('The district name of the address.'),
        district_code: z.string().optional().describe('The district code of the address.'),
        town: z.string().optional().describe('The town name of the address.'),
        zip: z.string().optional().describe('The postal or ZIP code of the address.'),
        def: z.boolean().optional().describe('Whether this address is the default address for the customer.'),
        address_type: z.union([z.string(), z.number()]).optional().describe('The type of address (e.g., home, work).')
    })
    .describe('The newly created customer address.');

/**
 * @tags: [write]
 * @tagReason: Creates a new address record on the provider for the specified customer.
 * @pitfalls: The first address created for a customer automatically becomes the default address (def: true) regardless of the def input value. The provider returns address_type as a number (e.g., 0) even though the description implies string values.
 */
const action = createAction({
    description: 'Add a new address to a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/customers/customer-address/create-customer-address
        const response = await nango.post({
            endpoint: `/admin/openapi/v20260601/customers/${encodeURIComponent(input.customer_id)}/addresses.json`,
            data: {
                customer_address: {
                    address1: input.address1,
                    ...(input.first_name !== undefined && { first_name: input.first_name }),
                    ...(input.last_name !== undefined && { last_name: input.last_name }),
                    ...(input.address2 !== undefined && { address2: input.address2 }),
                    ...(input.phone !== undefined && { phone: input.phone }),
                    ...(input.company !== undefined && { company: input.company }),
                    ...(input.country !== undefined && { country: input.country }),
                    ...(input.country_code !== undefined && { country_code: input.country_code }),
                    ...(input.province !== undefined && { province: input.province }),
                    ...(input.province_code !== undefined && { province_code: input.province_code }),
                    ...(input.city !== undefined && { city: input.city }),
                    ...(input.city_code !== undefined && { city_code: input.city_code }),
                    ...(input.district !== undefined && { district: input.district }),
                    ...(input.district_code !== undefined && { district_code: input.district_code }),
                    ...(input.town !== undefined && { town: input.town }),
                    ...(input.zip !== undefined && { zip: input.zip }),
                    ...(input.def !== undefined && { def: input.def }),
                    ...(input.address_type !== undefined && { address_type: input.address_type })
                }
            },
            retries: 3
        });

        const parsedResponse = z
            .object({
                customer_address: ProviderCustomerAddressSchema
            })
            .parse(response.data);

        const providerAddress = parsedResponse.customer_address;

        const output: z.infer<typeof OutputSchema> = {
            id: providerAddress.id,
            customer_id: providerAddress.customer_id ?? input.customer_id
        };

        if (providerAddress.address1 != null) {
            output.address1 = providerAddress.address1;
        }
        if (providerAddress.first_name != null) {
            output.first_name = providerAddress.first_name;
        }
        if (providerAddress.last_name != null) {
            output.last_name = providerAddress.last_name;
        }
        if (providerAddress.address2 != null) {
            output.address2 = providerAddress.address2;
        }
        if (providerAddress.phone != null) {
            output.phone = providerAddress.phone;
        }
        if (providerAddress.company != null) {
            output.company = providerAddress.company;
        }
        if (providerAddress.country != null) {
            output.country = providerAddress.country;
        }
        if (providerAddress.country_code != null) {
            output.country_code = providerAddress.country_code;
        }
        if (providerAddress.province != null) {
            output.province = providerAddress.province;
        }
        if (providerAddress.province_code != null) {
            output.province_code = providerAddress.province_code;
        }
        if (providerAddress.city != null) {
            output.city = providerAddress.city;
        }
        if (providerAddress.city_code != null) {
            output.city_code = providerAddress.city_code;
        }
        if (providerAddress.district != null) {
            output.district = providerAddress.district;
        }
        if (providerAddress.district_code != null) {
            output.district_code = providerAddress.district_code;
        }
        if (providerAddress.town != null) {
            output.town = providerAddress.town;
        }
        if (providerAddress.zip != null) {
            output.zip = providerAddress.zip;
        }
        if (providerAddress.def != null) {
            output.def = providerAddress.def;
        }
        if (providerAddress.address_type != null) {
            output.address_type = providerAddress.address_type;
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
