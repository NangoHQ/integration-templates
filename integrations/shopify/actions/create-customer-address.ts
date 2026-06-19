import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The globally-unique ID of the Shopify customer. Example: "gid://shopify/Customer/1234567890"'),
    address1: z.string().optional().describe('The first line of the address. Typically the street address or PO Box number.'),
    address2: z.string().optional().describe('The second line of the address. Typically the apartment, suite, or unit number.'),
    city: z.string().optional().describe('The name of the city, district, village, or town.'),
    company: z.string().optional().describe("The name of the customer's company or organization."),
    countryCode: z.string().optional().describe('The two-letter ISO country code for the address. Example: "US"'),
    firstName: z.string().optional().describe('The first name of the customer.'),
    lastName: z.string().optional().describe('The last name of the customer.'),
    phone: z.string().optional().describe('A unique phone number for the customer, formatted using E.164 standard. Example: "+16135551111"'),
    provinceCode: z.string().optional().describe('The code for the region of the address, such as the province, state, or district. Example: "ON"'),
    zip: z.string().optional().describe('The zip or postal code of the address.'),
    setAsDefault: z.boolean().optional().describe("Whether to set the address as the customer's default address.")
});

const MailingAddressSchema = z.object({
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
    zip: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    formattedArea: z.string().nullable().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            customerAddressCreate: z
                .object({
                    address: MailingAddressSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string().nullable().optional()
            })
        )
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    company: z.string().optional(),
    country: z.string().optional(),
    countryCodeV2: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    province: z.string().optional(),
    provinceCode: z.string().optional(),
    zip: z.string().optional(),
    name: z.string().optional(),
    formattedArea: z.string().optional()
});

const action = createAction({
    description: 'Add an address to a Shopify customer.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const addressInput: Record<string, string | undefined> = {};
        if (input.address1 !== undefined) {
            addressInput['address1'] = input.address1;
        }
        if (input.address2 !== undefined) {
            addressInput['address2'] = input.address2;
        }
        if (input.city !== undefined) {
            addressInput['city'] = input.city;
        }
        if (input.company !== undefined) {
            addressInput['company'] = input.company;
        }
        if (input.countryCode !== undefined) {
            addressInput['countryCode'] = input.countryCode;
        }
        if (input.firstName !== undefined) {
            addressInput['firstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            addressInput['lastName'] = input.lastName;
        }
        if (input.phone !== undefined) {
            addressInput['phone'] = input.phone;
        }
        if (input.provinceCode !== undefined) {
            addressInput['provinceCode'] = input.provinceCode;
        }
        if (input.zip !== undefined) {
            addressInput['zip'] = input.zip;
        }

        const variables: Record<string, unknown> = {
            customerId: input.customerId,
            address: addressInput
        };
        if (input.setAsDefault !== undefined) {
            variables['setAsDefault'] = input.setAsDefault;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/customerAddressCreate
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `mutation customerAddressCreate($customerId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
                    customerAddressCreate(customerId: $customerId, address: $address, setAsDefault: $setAsDefault) {
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
                            name
                            formattedArea
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                variables
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join('; ')
            });
        }

        const payload = parsed.data?.customerAddressCreate;
        if (!payload) {
            throw new nango.ActionError({
                type: 'missing_payload',
                message: 'Unexpected response from Shopify: customerAddressCreate payload is missing.'
            });
        }

        if (payload.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'user_error',
                message: payload.userErrors.map((e) => e.message).join('; ')
            });
        }

        const address = payload.address;
        if (!address) {
            throw new nango.ActionError({
                type: 'missing_address',
                message: 'Address was not returned in the Shopify response.'
            });
        }

        return {
            id: address.id,
            ...(address.address1 != null && { address1: address.address1 }),
            ...(address.address2 != null && { address2: address.address2 }),
            ...(address.city != null && { city: address.city }),
            ...(address.company != null && { company: address.company }),
            ...(address.country != null && { country: address.country }),
            ...(address.countryCodeV2 != null && { countryCodeV2: address.countryCodeV2 }),
            ...(address.firstName != null && { firstName: address.firstName }),
            ...(address.lastName != null && { lastName: address.lastName }),
            ...(address.phone != null && { phone: address.phone }),
            ...(address.province != null && { province: address.province }),
            ...(address.provinceCode != null && { provinceCode: address.provinceCode }),
            ...(address.zip != null && { zip: address.zip }),
            ...(address.name != null && { name: address.name }),
            ...(address.formattedArea != null && { formattedArea: address.formattedArea })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
