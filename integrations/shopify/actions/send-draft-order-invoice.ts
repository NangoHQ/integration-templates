import { z } from 'zod';
import { createAction } from 'nango';

const EmailInputSchema = z.object({
    bcc: z.array(z.string()).optional(),
    body: z.string().optional(),
    customMessage: z.string().optional(),
    from: z.string().optional(),
    subject: z.string().optional(),
    to: z.string().optional()
});

const InputSchema = z.object({
    id: z.string().describe('The globally unique ID of the draft order to send the invoice for. Example: gid://shopify/DraftOrder/123456789'),
    email: EmailInputSchema.optional().describe('Optional email customization fields.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const MailingAddressSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    name: z.string().optional()
});

const CustomerSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional()
});

const LineItemVariantSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional()
});

const LineItemSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    quantity: z.number().optional(),
    sku: z.string().optional(),
    variant: LineItemVariantSchema.optional()
});

const LineItemEdgeSchema = z.object({
    node: LineItemSchema.optional()
});

const LineItemConnectionSchema = z.object({
    edges: z.array(LineItemEdgeSchema).optional()
});

const DraftOrderSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    email: z.string().optional(),
    invoiceSentAt: z.string().optional(),
    invoiceUrl: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    completedAt: z.string().optional(),
    currencyCode: z.string().optional(),
    taxesIncluded: z.boolean().optional(),
    taxExempt: z.boolean().optional(),
    note2: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customer: CustomerSchema.optional(),
    shippingAddress: MailingAddressSchema.optional(),
    billingAddress: MailingAddressSchema.optional(),
    lineItems: LineItemConnectionSchema.optional()
});

const OutputSchema = z.object({
    draftOrder: DraftOrderSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const ResponseSchema = z.object({
    data: z
        .object({
            draftOrderInvoiceSend: z
                .object({
                    draftOrder: DraftOrderSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.unknown().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Send the invoice email for a Shopify draft order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation draftOrderInvoiceSend($id: ID!, $email: EmailInput) {
                draftOrderInvoiceSend(id: $id, email: $email) {
                    draftOrder {
                        id
                        name
                        status
                        email
                        invoiceSentAt
                        invoiceUrl
                        createdAt
                        updatedAt
                        completedAt
                        currencyCode
                        taxesIncluded
                        taxExempt
                        note2
                        tags
                        customer {
                            id
                            email
                            firstName
                            lastName
                        }
                        shippingAddress {
                            firstName
                            lastName
                            address1
                            address2
                            city
                            province
                            country
                            zip
                            phone
                            company
                            name
                        }
                        billingAddress {
                            firstName
                            lastName
                            address1
                            address2
                            city
                            province
                            country
                            zip
                            phone
                            company
                            name
                        }
                        lineItems(first: 10) {
                            edges {
                                node {
                                    id
                                    name
                                    quantity
                                    sku
                                    variant {
                                        id
                                        title
                                    }
                                }
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {
            id: input.id
        };

        if (input.email !== undefined) {
            variables['email'] = input.email;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/draftOrderInvoiceSend
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join(', ')
            });
        }

        const result = parsed.data?.draftOrderInvoiceSend;
        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Missing draftOrderInvoiceSend in response'
            });
        }

        return {
            ...(result.draftOrder != null ? { draftOrder: result.draftOrder } : {}),
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
