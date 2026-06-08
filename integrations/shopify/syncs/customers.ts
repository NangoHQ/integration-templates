import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MailingAddressSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    provinceCode: z.string().nullable().optional(),
    countryCodeV2: z.string().nullable().optional()
});

const CustomerEmailAddressSchema = z.object({
    emailAddress: z.string().optional(),
    marketingOptInLevel: z.string().optional(),
    marketingState: z.string(),
    marketingUpdatedAt: z.string().optional()
});

const CustomerPhoneNumberSchema = z.object({
    phoneNumber: z.string(),
    marketingCollectedFrom: z.string().optional(),
    marketingOptInLevel: z.string().optional(),
    marketingState: z.string(),
    marketingUpdatedAt: z.string().optional()
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    displayName: z.string().optional(),
    defaultEmailAddress: CustomerEmailAddressSchema.nullable().optional(),
    defaultPhoneNumber: CustomerPhoneNumberSchema.nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    numberOfOrders: z.string().optional(),
    state: z.string().optional(),
    amountSpent: MoneyV2Schema.optional(),
    verifiedEmail: z.boolean().optional(),
    taxExempt: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    addresses: z.array(MailingAddressSchema).optional(),
    defaultAddress: MailingAddressSchema.nullable().optional()
});

const CustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    emailMarketingState: z.string().optional(),
    emailMarketingOptInLevel: z.string().optional(),
    emailMarketingUpdatedAt: z.string().optional(),
    phone: z.string().optional(),
    phoneMarketingState: z.string().optional(),
    phoneMarketingCollectedFrom: z.string().optional(),
    phoneMarketingOptInLevel: z.string().optional(),
    phoneMarketingUpdatedAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    numberOfOrders: z.string().optional(),
    state: z.string().optional(),
    amountSpent: MoneyV2Schema.optional(),
    verifiedEmail: z.boolean().optional(),
    taxExempt: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    addresses: z
        .array(
            z.object({
                id: z.string(),
                firstName: z.string().optional(),
                lastName: z.string().optional(),
                address1: z.string().optional(),
                city: z.string().optional(),
                province: z.string().optional(),
                country: z.string().optional(),
                zip: z.string().optional(),
                phone: z.string().optional(),
                name: z.string().optional(),
                provinceCode: z.string().optional(),
                countryCodeV2: z.string().optional()
            })
        )
        .optional(),
    defaultAddress: z
        .object({
            id: z.string(),
            address1: z.string().optional(),
            city: z.string().optional(),
            province: z.string().optional(),
            country: z.string().optional(),
            zip: z.string().optional(),
            phone: z.string().optional(),
            provinceCode: z.string().optional(),
            countryCodeV2: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify customers with contact, consent, and tag data.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/customers'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', cursor: '' });
        const updatedAfter = checkpoint.updated_after || undefined;
        let cursor = checkpoint.cursor || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/customers
            endpoint: '/admin/api/2026-04/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query GetCustomers($first: Int!, $after: String, $query: String) {
                        customers(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
                            edges {
                                node {
                                    id
                                    firstName
                                    lastName
                                    displayName
                                    defaultEmailAddress {
                                        emailAddress
                                        marketingOptInLevel
                                        marketingState
                                        marketingUpdatedAt
                                    }
                                    defaultPhoneNumber {
                                        phoneNumber
                                        marketingCollectedFrom
                                        marketingOptInLevel
                                        marketingState
                                        marketingUpdatedAt
                                    }
                                    createdAt
                                    updatedAt
                                    numberOfOrders
                                    state
                                    amountSpent {
                                        amount
                                        currencyCode
                                    }
                                    verifiedEmail
                                    taxExempt
                                    tags
                                    addresses(first: 10) {
                                        id
                                        firstName
                                        lastName
                                        address1
                                        city
                                        province
                                        country
                                        zip
                                        phone
                                        name
                                        provinceCode
                                        countryCodeV2
                                    }
                                    defaultAddress {
                                        id
                                        address1
                                        city
                                        province
                                        country
                                        zip
                                        phone
                                        provinceCode
                                        countryCodeV2
                                    }
                                }
                                cursor
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: 50,
                    ...(cursor && { after: cursor }),
                    query: updatedAfter ? `updated_at:>${updatedAfter}` : ''
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.customers.pageInfo.endCursor',
                response_path: 'data.customers.edges',
                limit_name_in_request: 'variables.first',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined;

        for await (const edges of nango.paginate(proxyConfig)) {
            const parsedEdges = z.array(z.object({ node: ProviderCustomerSchema, cursor: z.string().optional() })).parse(edges);

            if (parsedEdges.length === 0) {
                continue;
            }

            const customers = [];

            for (const edge of parsedEdges) {
                const customer = edge.node;

                const mapped = {
                    id: customer.id,
                    ...(customer.firstName != null && { firstName: customer.firstName }),
                    ...(customer.lastName != null && { lastName: customer.lastName }),
                    ...(customer.displayName && { displayName: customer.displayName }),
                    ...(customer.defaultEmailAddress?.emailAddress && { email: customer.defaultEmailAddress.emailAddress }),
                    ...(customer.defaultEmailAddress?.marketingState && { emailMarketingState: customer.defaultEmailAddress.marketingState }),
                    ...(customer.defaultEmailAddress?.marketingOptInLevel && { emailMarketingOptInLevel: customer.defaultEmailAddress.marketingOptInLevel }),
                    ...(customer.defaultEmailAddress?.marketingUpdatedAt && { emailMarketingUpdatedAt: customer.defaultEmailAddress.marketingUpdatedAt }),
                    ...(customer.defaultPhoneNumber?.phoneNumber && { phone: customer.defaultPhoneNumber.phoneNumber }),
                    ...(customer.defaultPhoneNumber?.marketingState && { phoneMarketingState: customer.defaultPhoneNumber.marketingState }),
                    ...(customer.defaultPhoneNumber?.marketingCollectedFrom && {
                        phoneMarketingCollectedFrom: customer.defaultPhoneNumber.marketingCollectedFrom
                    }),
                    ...(customer.defaultPhoneNumber?.marketingOptInLevel && { phoneMarketingOptInLevel: customer.defaultPhoneNumber.marketingOptInLevel }),
                    ...(customer.defaultPhoneNumber?.marketingUpdatedAt && { phoneMarketingUpdatedAt: customer.defaultPhoneNumber.marketingUpdatedAt }),
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                    ...(customer.numberOfOrders != null && { numberOfOrders: customer.numberOfOrders }),
                    ...(customer.state != null && { state: customer.state }),
                    ...(customer.amountSpent && { amountSpent: customer.amountSpent }),
                    ...(customer.verifiedEmail !== undefined && { verifiedEmail: customer.verifiedEmail }),
                    ...(customer.taxExempt !== undefined && { taxExempt: customer.taxExempt }),
                    ...(customer.tags && { tags: customer.tags }),
                    ...(customer.addresses && {
                        addresses: customer.addresses.map((addr) => ({
                            id: addr.id,
                            ...(addr.firstName != null && { firstName: addr.firstName }),
                            ...(addr.lastName != null && { lastName: addr.lastName }),
                            ...(addr.address1 != null && { address1: addr.address1 }),
                            ...(addr.city != null && { city: addr.city }),
                            ...(addr.province != null && { province: addr.province }),
                            ...(addr.country != null && { country: addr.country }),
                            ...(addr.zip != null && { zip: addr.zip }),
                            ...(addr.phone != null && { phone: addr.phone }),
                            ...(addr.name != null && { name: addr.name }),
                            ...(addr.provinceCode != null && { provinceCode: addr.provinceCode }),
                            ...(addr.countryCodeV2 != null && { countryCodeV2: addr.countryCodeV2 })
                        }))
                    }),
                    ...(customer.defaultAddress != null && {
                        defaultAddress: {
                            id: customer.defaultAddress.id,
                            ...(customer.defaultAddress.address1 != null && { address1: customer.defaultAddress.address1 }),
                            ...(customer.defaultAddress.city != null && { city: customer.defaultAddress.city }),
                            ...(customer.defaultAddress.province != null && { province: customer.defaultAddress.province }),
                            ...(customer.defaultAddress.country != null && { country: customer.defaultAddress.country }),
                            ...(customer.defaultAddress.zip != null && { zip: customer.defaultAddress.zip }),
                            ...(customer.defaultAddress.phone != null && { phone: customer.defaultAddress.phone }),
                            ...(customer.defaultAddress.provinceCode != null && { provinceCode: customer.defaultAddress.provinceCode }),
                            ...(customer.defaultAddress.countryCodeV2 != null && { countryCodeV2: customer.defaultAddress.countryCodeV2 })
                        }
                    })
                };

                customers.push(mapped);

                if (maxUpdatedAt === undefined || customer.updatedAt > maxUpdatedAt) {
                    maxUpdatedAt = customer.updatedAt;
                }
            }

            await nango.batchSave(customers, 'Customer');

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor
                });
            }
        }

        if (maxUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
