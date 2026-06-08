import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the customer. Example: "gid://shopify/Customer/544365967"')
});

const AmountSpentSchema = z.object({
    amount: z.string().nullable(),
    currencyCode: z.string().nullable()
});

const DefaultEmailAddressSchema = z.object({
    emailAddress: z.string().nullable(),
    marketingState: z.string().nullable(),
    marketingUpdatedAt: z.string().nullable()
});

const DefaultPhoneNumberSchema = z.object({
    phoneNumber: z.string().nullable(),
    marketingState: z.string().nullable(),
    marketingUpdatedAt: z.string().nullable()
});

const MailingAddressSchema = z.object({
    address1: z.string().nullable(),
    address2: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    zip: z.string().nullable(),
    country: z.string().nullable(),
    countryCodeV2: z.string().nullable(),
    phone: z.string().nullable()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            customer: z.unknown().nullable().optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string().optional(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    defaultEmailAddress: DefaultEmailAddressSchema.nullable().optional(),
    defaultPhoneNumber: DefaultPhoneNumberSchema.nullable().optional(),
    tags: z.array(z.string()).optional(),
    note: z.string().nullable().optional(),
    verifiedEmail: z.boolean().nullable().optional(),
    state: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    numberOfOrders: z.string().nullable().optional(),
    amountSpent: AmountSpentSchema.nullable().optional(),
    defaultAddress: MailingAddressSchema.nullable().optional(),
    taxExempt: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    emailMarketingState: z.string().optional(),
    emailMarketingUpdatedAt: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneMarketingState: z.string().optional(),
    phoneMarketingUpdatedAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    note: z.string().optional(),
    verifiedEmail: z.boolean().optional(),
    state: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    numberOfOrders: z.string().optional(),
    amountSpent: z
        .object({
            amount: z.string().optional(),
            currencyCode: z.string().optional()
        })
        .optional(),
    defaultAddress: z
        .object({
            address1: z.string().optional(),
            address2: z.string().optional(),
            city: z.string().optional(),
            province: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
            countryCodeV2: z.string().optional(),
            phone: z.string().optional()
        })
        .optional(),
    taxExempt: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a Shopify customer by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-customer',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query GetCustomer($id: ID!) {
                        customer(id: $id) {
                            id
                            firstName
                            lastName
                            displayName
                            defaultEmailAddress {
                                emailAddress
                                marketingState
                                marketingUpdatedAt
                            }
                            defaultPhoneNumber {
                                phoneNumber
                                marketingState
                                marketingUpdatedAt
                            }
                            tags
                            note
                            verifiedEmail
                            state
                            createdAt
                            updatedAt
                            numberOfOrders
                            amountSpent {
                                amount
                                currencyCode
                            }
                            defaultAddress {
                                address1
                                address2
                                city
                                province
                                zip
                                country
                                countryCodeV2
                                phone
                            }
                            taxExempt
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const body = GraphQLResponseSchema.safeParse(response.data);
        if (!body.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response structure from Shopify'
            });
        }

        if (body.data.errors && body.data.errors.length > 0) {
            const error = body.data.errors[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: error?.message || 'GraphQL error from Shopify',
                code: error?.extensions?.code
            });
        }

        const raw = body.data.data?.customer;
        if (!raw) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found',
                id: input.id
            });
        }

        const providerCustomer = ProviderCustomerSchema.parse(raw);

        return {
            id: providerCustomer.id,
            ...(providerCustomer.firstName != null && { firstName: providerCustomer.firstName }),
            ...(providerCustomer.lastName != null && { lastName: providerCustomer.lastName }),
            ...(providerCustomer.displayName != null && { displayName: providerCustomer.displayName }),
            ...(providerCustomer.defaultEmailAddress != null && {
                emailAddress: providerCustomer.defaultEmailAddress.emailAddress ?? undefined,
                emailMarketingState: providerCustomer.defaultEmailAddress.marketingState ?? undefined,
                emailMarketingUpdatedAt: providerCustomer.defaultEmailAddress.marketingUpdatedAt ?? undefined
            }),
            ...(providerCustomer.defaultPhoneNumber != null && {
                phoneNumber: providerCustomer.defaultPhoneNumber.phoneNumber ?? undefined,
                phoneMarketingState: providerCustomer.defaultPhoneNumber.marketingState ?? undefined,
                phoneMarketingUpdatedAt: providerCustomer.defaultPhoneNumber.marketingUpdatedAt ?? undefined
            }),
            ...(providerCustomer.tags != null && { tags: providerCustomer.tags }),
            ...(providerCustomer.note != null && { note: providerCustomer.note }),
            ...(providerCustomer.verifiedEmail != null && { verifiedEmail: providerCustomer.verifiedEmail }),
            ...(providerCustomer.state != null && { state: providerCustomer.state }),
            ...(providerCustomer.createdAt != null && { createdAt: providerCustomer.createdAt }),
            ...(providerCustomer.updatedAt != null && { updatedAt: providerCustomer.updatedAt }),
            ...(providerCustomer.numberOfOrders != null && { numberOfOrders: providerCustomer.numberOfOrders }),
            ...(providerCustomer.amountSpent != null && {
                amountSpent: {
                    ...(providerCustomer.amountSpent.amount != null && { amount: providerCustomer.amountSpent.amount }),
                    ...(providerCustomer.amountSpent.currencyCode != null && { currencyCode: providerCustomer.amountSpent.currencyCode })
                }
            }),
            ...(providerCustomer.defaultAddress != null && {
                defaultAddress: {
                    ...(providerCustomer.defaultAddress.address1 != null && { address1: providerCustomer.defaultAddress.address1 }),
                    ...(providerCustomer.defaultAddress.address2 != null && { address2: providerCustomer.defaultAddress.address2 }),
                    ...(providerCustomer.defaultAddress.city != null && { city: providerCustomer.defaultAddress.city }),
                    ...(providerCustomer.defaultAddress.province != null && { province: providerCustomer.defaultAddress.province }),
                    ...(providerCustomer.defaultAddress.zip != null && { zip: providerCustomer.defaultAddress.zip }),
                    ...(providerCustomer.defaultAddress.country != null && { country: providerCustomer.defaultAddress.country }),
                    ...(providerCustomer.defaultAddress.countryCodeV2 != null && { countryCodeV2: providerCustomer.defaultAddress.countryCodeV2 }),
                    ...(providerCustomer.defaultAddress.phone != null && { phone: providerCustomer.defaultAddress.phone })
                }
            }),
            ...(providerCustomer.taxExempt != null && { taxExempt: providerCustomer.taxExempt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
