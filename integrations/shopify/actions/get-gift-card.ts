import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the gift card. Example: "gid://shopify/GiftCard/123456789"')
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const CustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    email: z.string().optional().nullable()
});

const GiftCardSchema = z.object({
    id: z.string(),
    balance: MoneyV2Schema,
    initialValue: MoneyV2Schema,
    customer: CustomerSchema.nullable().optional(),
    expiresOn: z.string().nullable().optional(),
    maskedCode: z.string(),
    createdAt: z.string()
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    path: z.array(z.unknown()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        giftCard: GiftCardSchema.nullable().optional()
    }),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    balance: MoneyV2Schema,
    initialValue: MoneyV2Schema,
    customer: CustomerSchema.optional(),
    expiresOn: z.string().optional(),
    maskedCode: z.string(),
    createdAt: z.string()
});

const action = createAction({
    description: 'Retrieve a Shopify gift card by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-gift-card'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_gift_cards'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-07/queries/giftCard
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `
                    query GetGiftCard($id: ID!) {
                        giftCard(id: $id) {
                            id
                            balance {
                                amount
                                currencyCode
                            }
                            initialValue {
                                amount
                                currencyCode
                            }
                            customer {
                                id
                                firstName
                                lastName
                                email
                            }
                            expiresOn
                            maskedCode
                            createdAt
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.errors[0]?.message || 'Unknown Shopify GraphQL error',
                errors: parsed.errors
            });
        }

        const giftCard = parsed.data.giftCard;

        if (!giftCard) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Gift card not found for ID: ${input.id}`
            });
        }

        return {
            id: giftCard.id,
            balance: giftCard.balance,
            initialValue: giftCard.initialValue,
            ...(giftCard.customer != null && { customer: giftCard.customer }),
            ...(giftCard.expiresOn != null && { expiresOn: giftCard.expiresOn }),
            maskedCode: giftCard.maskedCode,
            createdAt: giftCard.createdAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
