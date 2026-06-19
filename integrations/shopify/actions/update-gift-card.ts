import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the gift card to update. Example: "gid://shopify/GiftCard/123"'),
    expiresOn: z.string().nullable().optional().describe('The expiration date of the gift card. Pass null to clear. Example: "2025-12-31"'),
    note: z.string().nullable().optional().describe('A note associated with the gift card. Pass null to clear.'),
    customerId: z
        .string()
        .nullable()
        .optional()
        .describe('The ID of the customer to assign the gift card to. Pass null to clear. Example: "gid://shopify/Customer/456"')
});

const ProviderMoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const ProviderCustomerSchema = z.object({
    id: z.string().optional().nullable()
});

const ProviderGiftCardSchema = z.object({
    id: z.string(),
    balance: ProviderMoneyV2Schema.nullable().optional(),
    createdAt: z.string().nullable().optional(),
    customer: ProviderCustomerSchema.nullable().optional(),
    deactivatedAt: z.string().nullable().optional(),
    enabled: z.boolean().nullable().optional(),
    expiresOn: z.string().nullable().optional(),
    initialValue: ProviderMoneyV2Schema.nullable().optional(),
    lastCharacters: z.string().nullable().optional(),
    maskedCode: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    templateSuffix: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const CustomerSchema = z.object({
    id: z.string().optional()
});

const GiftCardSchema = z.object({
    id: z.string(),
    balance: MoneyV2Schema.optional(),
    createdAt: z.string().optional(),
    customer: CustomerSchema.optional(),
    deactivatedAt: z.string().optional(),
    enabled: z.boolean().optional(),
    expiresOn: z.string().optional(),
    initialValue: MoneyV2Schema.optional(),
    lastCharacters: z.string().optional(),
    maskedCode: z.string().optional(),
    note: z.string().optional(),
    templateSuffix: z.string().optional(),
    updatedAt: z.string().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    giftCard: GiftCardSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Update a Shopify gift card.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_gift_cards', 'read_gift_cards'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/giftCardUpdate
            endpoint: '/admin/api/2026-07/graphql.json',
            data: {
                query: `mutation giftCardUpdate($id: ID!, $input: GiftCardUpdateInput!) {
    giftCardUpdate(id: $id, input: $input) {
        giftCard {
            id
            balance {
                amount
                currencyCode
            }
            createdAt
            customer {
                id
            }
            deactivatedAt
            enabled
            expiresOn
            initialValue {
                amount
                currencyCode
            }
            lastCharacters
            maskedCode
            note
            templateSuffix
            updatedAt
        }
        userErrors {
            field
            message
        }
    }
}`,
                variables: {
                    id: input.id,
                    input: {
                        ...(input.expiresOn !== undefined && { expiresOn: input.expiresOn }),
                        ...(input.note !== undefined && { note: input.note }),
                        ...(input.customerId !== undefined && { customerId: input.customerId })
                    }
                }
            },
            retries: 10
        });

        const GraphQLErrorSchema = z.object({
            message: z.string(),
            path: z.array(z.string()).optional()
        });

        const GraphQLResponseSchema = z.object({
            data: z
                .object({
                    giftCardUpdate: z
                        .object({
                            giftCard: ProviderGiftCardSchema.nullable().optional(),
                            userErrors: z.array(ProviderUserErrorSchema)
                        })
                        .optional()
                })
                .optional(),
            errors: z.array(GraphQLErrorSchema).optional()
        });

        const body = GraphQLResponseSchema.parse(response.data);

        if (body.errors != null && body.errors.length > 0) {
            const firstError = body.errors[0];
            if (firstError != null) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message
                });
            }
        }

        if (body.data == null || body.data.giftCardUpdate == null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify GraphQL API.'
            });
        }

        const result = body.data.giftCardUpdate;
        const giftCard = result.giftCard;

        return {
            ...(giftCard != null && {
                giftCard: {
                    id: giftCard.id,
                    ...(giftCard.balance != null && { balance: giftCard.balance }),
                    ...(giftCard.createdAt != null && { createdAt: giftCard.createdAt }),
                    ...(giftCard.customer != null && {
                        customer: {
                            ...(giftCard.customer.id != null && { id: giftCard.customer.id })
                        }
                    }),
                    ...(giftCard.deactivatedAt != null && { deactivatedAt: giftCard.deactivatedAt }),
                    ...(giftCard.enabled != null && { enabled: giftCard.enabled }),
                    ...(giftCard.expiresOn != null && { expiresOn: giftCard.expiresOn }),
                    ...(giftCard.initialValue != null && { initialValue: giftCard.initialValue }),
                    ...(giftCard.lastCharacters != null && { lastCharacters: giftCard.lastCharacters }),
                    ...(giftCard.maskedCode != null && { maskedCode: giftCard.maskedCode }),
                    ...(giftCard.note != null && { note: giftCard.note }),
                    ...(giftCard.templateSuffix != null && { templateSuffix: giftCard.templateSuffix }),
                    ...(giftCard.updatedAt != null && { updatedAt: giftCard.updatedAt })
                }
            }),
            userErrors: result.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
