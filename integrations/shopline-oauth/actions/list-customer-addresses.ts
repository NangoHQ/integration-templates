import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z
    .object({
        id: z.string().describe('Unique identifier for the address.'),
        first_name: z.string().nullable().optional().describe('First name of the recipient.'),
        last_name: z.string().nullable().optional().describe('Last name of the recipient.'),
        company: z.string().nullable().optional().describe('Company name associated with the address.'),
        address1: z.string().nullable().optional().describe('Primary street address line.'),
        address2: z.string().nullable().optional().describe('Secondary street address line.'),
        city: z.string().nullable().optional().describe('City name.'),
        province: z.string().nullable().optional().describe('Province or state name.'),
        country: z.string().nullable().optional().describe('Country name.'),
        zip: z.string().nullable().optional().describe('Postal or ZIP code.'),
        phone: z.string().nullable().optional().describe('Phone number associated with the address.'),
        def: z.boolean().nullable().optional().describe('Whether this is the default address for the customer.'),
        address_type: z.number().nullable().optional().describe('Address type identifier.'),
        country_code: z.string().nullable().optional().describe('ISO country code.'),
        province_code: z.string().nullable().optional().describe('Province code.'),
        province_code_v2: z.string().nullable().optional().describe('Alternative province code.'),
        city_code: z.string().nullable().optional().describe('City code.'),
        district: z.string().nullable().optional().describe('District name.'),
        district_code: z.string().nullable().optional().describe('District code.'),
        town: z.string().nullable().optional().describe('Town name.')
    })
    .passthrough()
    .describe('A customer address with optional contact and location fields.');

const UserAddressSchema = z
    .object({
        uid: z.string().describe('Customer ID whose addresses are returned.'),
        addresses: z.array(AddressSchema).describe('List of addresses for this customer.')
    })
    .describe('Customer ID and the associated address list for that customer.');

const InputSchema = z
    .object({
        uids: z.array(z.string()).describe('List of customer IDs to fetch addresses for. Required.'),
        address_types: z.array(z.string()).optional().describe('Optional list of address types to filter by.')
    })
    .describe('Input for batch-fetching customer addresses by customer ID.');

const OutputSchema = z
    .object({
        user_addresses: z.array(UserAddressSchema).describe('List of customer-address mappings, one entry per requested customer ID.')
    })
    .describe('Output containing customer addresses grouped by customer ID.');

/**
 * @tags: [read]
 * @tagReason: This action only reads existing customer addresses from the provider.
 * @pitfalls: The API may return results in a different order than the input uids array with no guaranteed ordering; match results by uid rather than by index.
 */
const action = createAction({
    description: 'Batch-fetch addresses for one or more customers by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { uids: string[]; address_types?: string[] } = {
            uids: input.uids
        };

        if (input.address_types !== undefined) {
            requestBody.address_types = input.address_types;
        }

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/address/list-customer-addresses
        const response = await nango.post({
            endpoint: '/admin/openapi/v20260601/customers/addresses/list.json',
            data: requestBody,
            retries: 3
        });

        const providerResponse = z
            .object({
                user_address: z.array(
                    z.object({
                        uid: z.string(),
                        addresses: z.array(z.object({}).passthrough())
                    })
                )
            })
            .parse(response.data);

        return {
            user_addresses: providerResponse.user_address.map((entry) => ({
                uid: entry.uid,
                addresses: entry.addresses.map((addr) => AddressSchema.parse(addr))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
