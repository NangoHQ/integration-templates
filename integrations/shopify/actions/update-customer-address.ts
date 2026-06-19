import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The globally-unique ID of the customer. Example: "gid://shopify/Customer/123"'),
    addressId: z.string().describe('The globally-unique ID of the address to update. Example: "gid://shopify/MailingAddress/456?model_name=CustomerAddress"'),
    address1: z.string().optional().describe('The first line of the address. Typically the street address or PO Box number.'),
    address2: z.string().optional().describe('The second line of the address. Typically the number of the apartment, suite, or unit.'),
    city: z.string().optional().describe('The name of the city, district, village, or town.'),
    company: z.string().optional().describe("The name of the customer's company or organization."),
    countryCode: z.string().optional().describe('The two-letter code for the country of the address. Example: "US"'),
    firstName: z.string().optional().describe('The first name of the customer.'),
    lastName: z.string().optional().describe('The last name of the customer.'),
    phone: z.string().optional().describe('A unique phone number for the customer. Formatted using E.164 standard. Example: "+16135551111"'),
    provinceCode: z.string().optional().describe('The code for the region of the address, such as the province, state, or district. Example: "QC"'),
    zip: z.string().optional().describe('The zip or postal code of the address.'),
    setAsDefault: z.boolean().optional().describe("Whether to set the address as the customer's default address.")
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string().nullable().optional()
});

const ProviderAddressSchema = z.object({
    id: z.string(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    countryCodeV2: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    provinceCode: z.string().nullable().optional(),
    zip: z.string().nullable().optional()
});

const GraphQLErrorSchema = z.object({
    message: z.string().nullable().optional(),
    path: z.array(z.unknown()).nullable().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            customerAddressUpdate: z
                .object({
                    address: ProviderAddressSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    company: z.string().optional(),
    country: z.string().optional(),
    countryCode: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    province: z.string().optional(),
    provinceCode: z.string().optional(),
    zip: z.string().optional()
});

const action = createAction({
    description: 'Update an address on a Shopify customer',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/customerAddressUpdate
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `
                    mutation customerAddressUpdate($customerId: ID!, $addressId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
                        customerAddressUpdate(customerId: $customerId, addressId: $addressId, address: $address, setAsDefault: $setAsDefault) {
                            address {
                                id
                                address1
                                address2
                                city
                                company
                                country
                                countryCodeV2
                                firstName
                                lastName
                                phone
                                province
                                provinceCode
                                zip
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    customerId: input.customerId,
                    addressId: input.addressId,
                    address: {
                        ...(input.address1 !== undefined && { address1: input.address1 }),
                        ...(input.address2 !== undefined && { address2: input.address2 }),
                        ...(input.city !== undefined && { city: input.city }),
                        ...(input.company !== undefined && { company: input.company }),
                        ...(input.countryCode !== undefined && { countryCode: input.countryCode }),
                        ...(input.firstName !== undefined && { firstName: input.firstName }),
                        ...(input.lastName !== undefined && { lastName: input.lastName }),
                        ...(input.phone !== undefined && { phone: input.phone }),
                        ...(input.provinceCode !== undefined && { provinceCode: input.provinceCode }),
                        ...(input.zip !== undefined && { zip: input.zip })
                    },
                    ...(input.setAsDefault !== undefined && { setAsDefault: input.setAsDefault })
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        const [topLevelError] = parsed.errors || [];
        if (topLevelError !== undefined) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: topLevelError.message || 'Shopify GraphQL error'
            });
        }

        const result = parsed.data?.customerAddressUpdate;
        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Missing customerAddressUpdate in response'
            });
        }

        const [firstError] = result.userErrors;
        if (firstError !== undefined) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: firstError.message || 'Shopify validation error',
                field: firstError.field ? firstError.field.join('.') : undefined
            });
        }

        const address = result.address;
        if (!address) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Address not found or could not be updated'
            });
        }

        return {
            id: address.id,
            ...(address.address1 != null && { address1: address.address1 }),
            ...(address.address2 != null && { address2: address.address2 }),
            ...(address.city != null && { city: address.city }),
            ...(address.company != null && { company: address.company }),
            ...(address.country != null && { country: address.country }),
            ...(address.countryCodeV2 != null && { countryCode: address.countryCodeV2 }),
            ...(address.firstName != null && { firstName: address.firstName }),
            ...(address.lastName != null && { lastName: address.lastName }),
            ...(address.phone != null && { phone: address.phone }),
            ...(address.province != null && { province: address.province }),
            ...(address.provinceCode != null && { provinceCode: address.provinceCode }),
            ...(address.zip != null && { zip: address.zip })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
