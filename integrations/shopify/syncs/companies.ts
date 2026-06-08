import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CompanyAddressSchema = z.object({
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const CompanyContactCustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const CompanyContactSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    isMainContact: z.boolean(),
    customer: CompanyContactCustomerSchema.nullable().optional()
});

const CompanyLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    externalId: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    shippingAddress: CompanyAddressSchema.nullable().optional(),
    billingAddress: CompanyAddressSchema.nullable().optional()
});

const CompanyNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    note: z.string().nullable().optional(),
    externalId: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    customerSince: z.string(),
    mainContact: z
        .object({
            id: z.string(),
            title: z.string().nullable().optional(),
            customer: CompanyContactCustomerSchema.nullable().optional()
        })
        .nullable()
        .optional(),
    contacts: z
        .object({
            nodes: z.array(CompanyContactSchema).optional().default([])
        })
        .optional(),
    locations: z
        .object({
            nodes: z.array(CompanyLocationSchema).optional().default([])
        })
        .optional(),
    totalSpent: z.object({
        amount: z.string(),
        currencyCode: z.string()
    })
});

const CompanySchema = z.object({
    id: z.string(),
    name: z.string(),
    note: z.string().optional(),
    externalId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    customerSince: z.string(),
    mainContactId: z.string().optional(),
    mainContactTitle: z.string().optional(),
    mainContactCustomerFirstName: z.string().optional(),
    mainContactCustomerLastName: z.string().optional(),
    mainContactCustomerEmail: z.string().optional(),
    mainContactCustomerPhone: z.string().optional(),
    totalSpentAmount: z.string().optional(),
    totalSpentCurrencyCode: z.string().optional(),
    contacts: z
        .array(
            z.object({
                id: z.string(),
                title: z.string().optional(),
                isMainContact: z.boolean(),
                customerFirstName: z.string().optional(),
                customerLastName: z.string().optional(),
                customerEmail: z.string().optional(),
                customerPhone: z.string().optional()
            })
        )
        .optional(),
    locations: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                externalId: z.string().optional(),
                note: z.string().optional(),
                phone: z.string().optional(),
                createdAt: z.string(),
                updatedAt: z.string(),
                shippingAddress1: z.string().optional(),
                shippingAddress2: z.string().optional(),
                shippingCity: z.string().optional(),
                shippingProvince: z.string().optional(),
                shippingCountry: z.string().optional(),
                shippingZip: z.string().optional(),
                shippingPhone: z.string().optional(),
                billingAddress1: z.string().optional(),
                billingAddress2: z.string().optional(),
                billingCity: z.string().optional(),
                billingProvince: z.string().optional(),
                billingCountry: z.string().optional(),
                billingZip: z.string().optional(),
                billingPhone: z.string().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify B2B companies with contact and location data.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/companies' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['read_companies', 'read_customers'],
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after ?? '';
        let cursor = checkpoint?.cursor || undefined;
        let lastProcessedUpdatedAt: string | undefined;

        // https://shopify.dev/docs/api/admin-graphql/2026-01/queries/companies
        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-01/queries/companies
            endpoint: '/admin/api/2026-01/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query GetCompanies($first: Int!, $after: String, $query: String) {
                        companies(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
                            nodes {
                                id
                                name
                                note
                                externalId
                                createdAt
                                updatedAt
                                customerSince
                                mainContact {
                                    id
                                    title
                                }
                                contacts(first: 50) {
                                    nodes {
                                        id
                                        title
                                        isMainContact
                                    }
                                }
                                locations(first: 50) {
                                    nodes {
                                        id
                                        name
                                        externalId
                                        note
                                        phone
                                        createdAt
                                        updatedAt
                                        shippingAddress {
                                            address1
                                            address2
                                            city
                                            province
                                            country
                                            zip
                                            phone
                                        }
                                        billingAddress {
                                            address1
                                            address2
                                            city
                                            province
                                            country
                                            zip
                                            phone
                                        }
                                    }
                                }
                                totalSpent {
                                    amount
                                    currencyCode
                                }
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
                    ...(updatedAfter && { query: `updated_at:>${updatedAfter}` })
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.companies.pageInfo.endCursor',
                response_path: 'data.companies.nodes',
                limit_name_in_request: 'variables.first',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            if (!Array.isArray(batch)) {
                throw new Error('Expected companies batch to be an array');
            }

            const companies = [];

            for (const raw of batch) {
                const parsed = CompanyNodeSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse company node: ${parsed.error.message}`);
                }

                const node = parsed.data;

                const company = {
                    id: node.id,
                    name: node.name,
                    ...(node.note != null && { note: node.note }),
                    ...(node.externalId != null && { externalId: node.externalId }),
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    customerSince: node.customerSince,
                    ...(node.mainContact && {
                        mainContactId: node.mainContact.id,
                        ...(node.mainContact.title != null && { mainContactTitle: node.mainContact.title }),
                        ...(node.mainContact.customer?.firstName != null && {
                            mainContactCustomerFirstName: node.mainContact.customer.firstName
                        }),
                        ...(node.mainContact.customer?.lastName != null && {
                            mainContactCustomerLastName: node.mainContact.customer.lastName
                        }),
                        ...(node.mainContact.customer?.email != null && {
                            mainContactCustomerEmail: node.mainContact.customer.email
                        }),
                        ...(node.mainContact.customer?.phone != null && {
                            mainContactCustomerPhone: node.mainContact.customer.phone
                        })
                    }),
                    totalSpentAmount: node.totalSpent.amount,
                    totalSpentCurrencyCode: node.totalSpent.currencyCode,
                    contacts: node.contacts?.nodes?.map((contact) => ({
                        id: contact.id,
                        ...(contact.title != null && { title: contact.title }),
                        isMainContact: contact.isMainContact,
                        ...(contact.customer?.firstName != null && { customerFirstName: contact.customer.firstName }),
                        ...(contact.customer?.lastName != null && { customerLastName: contact.customer.lastName }),
                        ...(contact.customer?.email != null && { customerEmail: contact.customer.email }),
                        ...(contact.customer?.phone != null && { customerPhone: contact.customer.phone })
                    })),
                    locations: node.locations?.nodes?.map((location) => ({
                        id: location.id,
                        name: location.name,
                        ...(location.externalId != null && { externalId: location.externalId }),
                        ...(location.note != null && { note: location.note }),
                        ...(location.phone != null && { phone: location.phone }),
                        createdAt: location.createdAt,
                        updatedAt: location.updatedAt,
                        ...(location.shippingAddress?.address1 != null && {
                            shippingAddress1: location.shippingAddress.address1
                        }),
                        ...(location.shippingAddress?.address2 != null && {
                            shippingAddress2: location.shippingAddress.address2
                        }),
                        ...(location.shippingAddress?.city != null && {
                            shippingCity: location.shippingAddress.city
                        }),
                        ...(location.shippingAddress?.province != null && {
                            shippingProvince: location.shippingAddress.province
                        }),
                        ...(location.shippingAddress?.country != null && {
                            shippingCountry: location.shippingAddress.country
                        }),
                        ...(location.shippingAddress?.zip != null && {
                            shippingZip: location.shippingAddress.zip
                        }),
                        ...(location.shippingAddress?.phone != null && {
                            shippingPhone: location.shippingAddress.phone
                        }),
                        ...(location.billingAddress?.address1 != null && {
                            billingAddress1: location.billingAddress.address1
                        }),
                        ...(location.billingAddress?.address2 != null && {
                            billingAddress2: location.billingAddress.address2
                        }),
                        ...(location.billingAddress?.city != null && {
                            billingCity: location.billingAddress.city
                        }),
                        ...(location.billingAddress?.province != null && {
                            billingProvince: location.billingAddress.province
                        }),
                        ...(location.billingAddress?.country != null && {
                            billingCountry: location.billingAddress.country
                        }),
                        ...(location.billingAddress?.zip != null && {
                            billingZip: location.billingAddress.zip
                        }),
                        ...(location.billingAddress?.phone != null && {
                            billingPhone: location.billingAddress.phone
                        })
                    }))
                };

                companies.push(company);

                if (lastProcessedUpdatedAt === undefined || node.updatedAt > lastProcessedUpdatedAt) {
                    lastProcessedUpdatedAt = node.updatedAt;
                }
            }

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');

                if (cursor !== undefined) {
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter,
                        cursor
                    });
                }
            }
        }

        if (lastProcessedUpdatedAt !== undefined) {
            await nango.saveCheckpoint({
                updated_after: lastProcessedUpdatedAt,
                cursor: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
