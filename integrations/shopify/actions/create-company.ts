import { z } from 'zod';
import { createAction } from 'nango';

const CompanyAddressInputSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    countryCode: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    recipient: z.string().optional(),
    zip: z.string().optional(),
    zoneCode: z.string().optional()
});

const DepositInputSchema = z.object({
    percentage: z.number()
});

const BuyerExperienceConfigurationInputSchema = z.object({
    checkoutToDraft: z.boolean().optional(),
    deposit: DepositInputSchema.optional(),
    editableShippingAddress: z.boolean().optional(),
    paymentTermsTemplateId: z.string().optional()
});

const CompanyInputSchema = z.object({
    name: z.string(),
    externalId: z.string().optional(),
    note: z.string().optional(),
    customerSince: z.string().optional()
});

const CompanyContactInputSchema = z.object({
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    locale: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional()
});

const CompanyLocationInputSchema = z.object({
    name: z.string().optional(),
    externalId: z.string().optional(),
    note: z.string().optional(),
    phone: z.string().optional(),
    locale: z.string().optional(),
    billingSameAsShipping: z.boolean().optional(),
    billingAddress: CompanyAddressInputSchema.optional(),
    shippingAddress: CompanyAddressInputSchema.optional(),
    taxExempt: z.boolean().optional(),
    taxExemptions: z.array(z.string()).optional(),
    taxRegistrationId: z.string().optional(),
    buyerExperienceConfiguration: BuyerExperienceConfigurationInputSchema.optional()
});

const InputSchema = z.object({
    company: CompanyInputSchema,
    companyContact: CompanyContactInputSchema.optional(),
    companyLocation: CompanyLocationInputSchema.optional()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        companyCreate: z.object({
            company: z
                .object({
                    id: z.string(),
                    name: z.string(),
                    externalId: z.string().nullable().optional(),
                    createdAt: z.string(),
                    updatedAt: z.string(),
                    customerSince: z.string().nullable().optional(),
                    note: z.string().nullable().optional(),
                    mainContact: z
                        .object({
                            id: z.string(),
                            customer: z
                                .object({
                                    id: z.string(),
                                    email: z.string().nullable().optional(),
                                    firstName: z.string().nullable().optional(),
                                    lastName: z.string().nullable().optional()
                                })
                                .nullable()
                                .optional()
                        })
                        .nullable()
                        .optional(),
                    locations: z
                        .object({
                            edges: z.array(
                                z.object({
                                    node: z.object({
                                        id: z.string(),
                                        name: z.string()
                                    })
                                })
                            )
                        })
                        .nullable()
                        .optional(),
                    contacts: z
                        .object({
                            edges: z.array(
                                z.object({
                                    node: z.object({
                                        id: z.string(),
                                        customer: z
                                            .object({
                                                email: z.string().nullable().optional(),
                                                firstName: z.string().nullable().optional(),
                                                lastName: z.string().nullable().optional()
                                            })
                                            .nullable()
                                            .optional()
                                    })
                                })
                            )
                        })
                        .nullable()
                        .optional()
                })
                .nullable()
                .optional(),
            userErrors: z.array(
                z.object({
                    field: z.array(z.string()).nullable().optional(),
                    message: z.string(),
                    code: z.string().nullable().optional()
                })
            )
        })
    })
});

const OutputSchema = z.object({
    company: z
        .object({
            id: z.string(),
            name: z.string(),
            externalId: z.string().optional(),
            createdAt: z.string(),
            updatedAt: z.string(),
            customerSince: z.string().optional(),
            note: z.string().optional(),
            mainContact: z
                .object({
                    id: z.string(),
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
                        name: z.string()
                    })
                )
                .optional(),
            contacts: z
                .array(
                    z.object({
                        id: z.string(),
                        email: z.string().optional(),
                        firstName: z.string().optional(),
                        lastName: z.string().optional()
                    })
                )
                .optional()
        })
        .nullable()
        .optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string(),
            code: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Create a B2B company in Shopify.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_companies', 'write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables = {
            input: {
                company: {
                    name: input.company.name,
                    ...(input.company.externalId !== undefined && { externalId: input.company.externalId }),
                    ...(input.company.note !== undefined && { note: input.company.note }),
                    ...(input.company.customerSince !== undefined && { customerSince: input.company.customerSince })
                },
                ...(input.companyContact !== undefined && {
                    companyContact: {
                        ...(input.companyContact.email !== undefined && { email: input.companyContact.email }),
                        ...(input.companyContact.firstName !== undefined && { firstName: input.companyContact.firstName }),
                        ...(input.companyContact.lastName !== undefined && { lastName: input.companyContact.lastName }),
                        ...(input.companyContact.locale !== undefined && { locale: input.companyContact.locale }),
                        ...(input.companyContact.phone !== undefined && { phone: input.companyContact.phone }),
                        ...(input.companyContact.title !== undefined && { title: input.companyContact.title })
                    }
                }),
                ...(input.companyLocation !== undefined && {
                    companyLocation: {
                        ...(input.companyLocation.name !== undefined && { name: input.companyLocation.name }),
                        ...(input.companyLocation.externalId !== undefined && { externalId: input.companyLocation.externalId }),
                        ...(input.companyLocation.note !== undefined && { note: input.companyLocation.note }),
                        ...(input.companyLocation.phone !== undefined && { phone: input.companyLocation.phone }),
                        ...(input.companyLocation.locale !== undefined && { locale: input.companyLocation.locale }),
                        ...(input.companyLocation.billingSameAsShipping !== undefined && {
                            billingSameAsShipping: input.companyLocation.billingSameAsShipping
                        }),
                        ...(input.companyLocation.billingAddress !== undefined && { billingAddress: input.companyLocation.billingAddress }),
                        ...(input.companyLocation.shippingAddress !== undefined && { shippingAddress: input.companyLocation.shippingAddress }),
                        ...(input.companyLocation.taxExempt !== undefined && { taxExempt: input.companyLocation.taxExempt }),
                        ...(input.companyLocation.taxExemptions !== undefined && { taxExemptions: input.companyLocation.taxExemptions }),
                        ...(input.companyLocation.taxRegistrationId !== undefined && { taxRegistrationId: input.companyLocation.taxRegistrationId }),
                        ...(input.companyLocation.buyerExperienceConfiguration !== undefined && {
                            buyerExperienceConfiguration: {
                                ...(input.companyLocation.buyerExperienceConfiguration.checkoutToDraft !== undefined && {
                                    checkoutToDraft: input.companyLocation.buyerExperienceConfiguration.checkoutToDraft
                                }),
                                ...(input.companyLocation.buyerExperienceConfiguration.deposit !== undefined && {
                                    deposit: { percentage: input.companyLocation.buyerExperienceConfiguration.deposit.percentage }
                                }),
                                ...(input.companyLocation.buyerExperienceConfiguration.editableShippingAddress !== undefined && {
                                    editableShippingAddress: input.companyLocation.buyerExperienceConfiguration.editableShippingAddress
                                }),
                                ...(input.companyLocation.buyerExperienceConfiguration.paymentTermsTemplateId !== undefined && {
                                    paymentTermsTemplateId: input.companyLocation.buyerExperienceConfiguration.paymentTermsTemplateId
                                })
                            }
                        })
                    }
                })
            }
        };

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/companyCreate
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query: `
                    mutation CompanyCreate($input: CompanyCreateInput!) {
                        companyCreate(input: $input) {
                            company {
                                id
                                name
                                externalId
                                createdAt
                                updatedAt
                                customerSince
                                note
                                mainContact {
                                    id
                                    customer {
                                        id
                                        email
                                        firstName
                                        lastName
                                    }
                                }
                                locations(first: 5) {
                                    edges {
                                        node {
                                            id
                                            name
                                        }
                                    }
                                }
                                contacts(first: 5) {
                                    edges {
                                        node {
                                            id
                                            customer {
                                                email
                                                firstName
                                                lastName
                                            }
                                        }
                                    }
                                }
                            }
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }
                `,
                variables
            },
            retries: 10
        });

        const parsed = GraphQLResponseSchema.parse(response.data);
        const result = parsed.data.companyCreate;

        return {
            company:
                result.company != null
                    ? {
                          id: result.company.id,
                          name: result.company.name,
                          ...(result.company.externalId != null && { externalId: result.company.externalId }),
                          createdAt: result.company.createdAt,
                          updatedAt: result.company.updatedAt,
                          ...(result.company.customerSince != null && { customerSince: result.company.customerSince }),
                          ...(result.company.note != null && { note: result.company.note }),
                          ...(result.company.mainContact != null && {
                              mainContact: {
                                  id: result.company.mainContact.id,
                                  ...(result.company.mainContact.customer != null && {
                                      customer: {
                                          id: result.company.mainContact.customer.id,
                                          ...(result.company.mainContact.customer.email != null && {
                                              email: result.company.mainContact.customer.email
                                          }),
                                          ...(result.company.mainContact.customer.firstName != null && {
                                              firstName: result.company.mainContact.customer.firstName
                                          }),
                                          ...(result.company.mainContact.customer.lastName != null && {
                                              lastName: result.company.mainContact.customer.lastName
                                          })
                                      }
                                  })
                              }
                          }),
                          ...(result.company.locations != null && {
                              locations: result.company.locations.edges.map((edge) => ({
                                  id: edge.node.id,
                                  name: edge.node.name
                              }))
                          }),
                          ...(result.company.contacts != null && {
                              contacts: result.company.contacts.edges
                                  .filter((edge) => edge.node != null)
                                  .map((edge) => ({
                                      id: edge.node.id,
                                      ...(edge.node.customer != null && {
                                          ...(edge.node.customer.email != null && { email: edge.node.customer.email }),
                                          ...(edge.node.customer.firstName != null && { firstName: edge.node.customer.firstName }),
                                          ...(edge.node.customer.lastName != null && { lastName: edge.node.customer.lastName })
                                      })
                                  }))
                          })
                      }
                    : null,
            userErrors: result.userErrors.map((err) => ({
                ...(err.field != null && { field: err.field }),
                message: err.message,
                ...(err.code != null && { code: err.code })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
