import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the company. Example: "gid://shopify/Company/123"')
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    email: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable()
});

const ProviderMainContactSchema = z.object({
    id: z.string(),
    title: z.string().optional().nullable(),
    customer: ProviderCustomerSchema.optional().nullable()
});

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    externalId: z.string().optional().nullable()
});

const ProviderLocationsConnectionSchema = z.object({
    edges: z
        .array(
            z.object({
                node: ProviderLocationSchema
            })
        )
        .optional()
        .nullable()
});

const ProviderCompanySchema = z.object({
    name: z.string(),
    externalId: z.string().optional().nullable(),
    contactCount: z.number().optional().nullable(),
    locationsCount: z
        .object({
            count: z.number().optional().nullable()
        })
        .optional()
        .nullable(),
    mainContact: ProviderMainContactSchema.optional().nullable(),
    locations: ProviderLocationsConnectionSchema.optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        company: ProviderCompanySchema.optional().nullable()
    })
});

const OutputSchema = z.object({
    name: z.string(),
    externalId: z.string().optional(),
    contactCount: z.number().optional(),
    locationCount: z.number().optional(),
    mainContact: z
        .object({
            id: z.string(),
            title: z.string().optional(),
            customer: z
                .object({
                    id: z.string(),
                    email: z.string().optional(),
                    firstName: z.string().optional(),
                    lastName: z.string().optional()
                })
                .optional()
        })
        .optional(),
    locations: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                externalId: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a Shopify B2B company by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-company',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_companies'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/company
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    query GetCompany($id: ID!) {
                        company(id: $id) {
                            name
                            externalId
                            contactCount
                            locationsCount {
                                count
                            }
                            mainContact {
                                id
                                title
                                customer {
                                    id
                                    email
                                    firstName
                                    lastName
                                }
                            }
                            locations(first: 100) {
                                edges {
                                    node {
                                        id
                                        name
                                        externalId
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const company = providerResponse.data.company;

        if (!company) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Company not found for id: ${input.id}`
            });
        }

        const locations =
            company.locations?.edges
                ?.filter((edge) => edge.node != null)
                .map((edge) => ({
                    id: edge.node.id,
                    name: edge.node.name,
                    ...(edge.node.externalId != null && { externalId: edge.node.externalId })
                })) ?? [];

        return {
            name: company.name,
            ...(company.externalId != null && { externalId: company.externalId }),
            ...(company.contactCount != null && { contactCount: company.contactCount }),
            ...(company.locationsCount?.count != null && {
                locationCount: company.locationsCount.count
            }),
            ...(company.mainContact != null && {
                mainContact: {
                    id: company.mainContact.id,
                    ...(company.mainContact.title != null && {
                        title: company.mainContact.title
                    }),
                    ...(company.mainContact.customer != null && {
                        customer: {
                            id: company.mainContact.customer.id,
                            ...(company.mainContact.customer.email != null && {
                                email: company.mainContact.customer.email
                            }),
                            ...(company.mainContact.customer.firstName != null && {
                                firstName: company.mainContact.customer.firstName
                            }),
                            ...(company.mainContact.customer.lastName != null && {
                                lastName: company.mainContact.customer.lastName
                            })
                        }
                    })
                }
            }),
            locations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
