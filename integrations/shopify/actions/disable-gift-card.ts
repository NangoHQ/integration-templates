import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the gift card to disable. Example: "gid://shopify/GiftCard/123456789"')
});

const UserErrorSchema = z.object({
    message: z.string(),
    field: z.array(z.string()).optional(),
    code: z.string().optional()
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currency_code: z.string()
});

const GiftCardSchema = z.object({
    id: z.string(),
    enabled: z.boolean(),
    deactivated_at: z.string().optional(),
    balance: MoneyV2Schema.optional(),
    initial_value: MoneyV2Schema.optional(),
    masked_code: z.string().optional(),
    last_characters: z.string().optional(),
    expires_on: z.string().optional(),
    note: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    gift_card: GiftCardSchema.optional(),
    user_errors: z.array(UserErrorSchema)
});

const ProviderMoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const ProviderGiftCardSchema = z.object({
    id: z.string(),
    enabled: z.boolean(),
    deactivatedAt: z.string().optional(),
    balance: ProviderMoneyV2Schema.optional(),
    initialValue: ProviderMoneyV2Schema.optional(),
    maskedCode: z.string().optional(),
    lastCharacters: z.string().optional(),
    expiresOn: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            giftCardDeactivate: z
                .object({
                    giftCard: z.unknown().optional(),
                    userErrors: z
                        .array(
                            z.object({
                                message: z.string(),
                                field: z.array(z.string()).optional(),
                                code: z.string().optional()
                            })
                        )
                        .optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional()
});

const action = createAction({
    description: 'Disable a Shopify gift card.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/disable-gift-card',
        group: 'Gift Cards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_gift_cards', 'read_gift_cards'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation giftCardDeactivate($id: ID!) {
                giftCardDeactivate(id: $id) {
                    giftCard {
                        id
                        enabled
                        deactivatedAt
                        balance {
                            amount
                            currencyCode
                        }
                        initialValue {
                            amount
                            currencyCode
                        }
                        maskedCode
                        lastCharacters
                        expiresOn
                        note
                        createdAt
                        updatedAt
                    }
                    userErrors {
                        message
                        field
                        code
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/giftCardDeactivate
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Shopify GraphQL API'
            });
        }

        const deactivateResult = parsedResponse.data.data?.giftCardDeactivate;
        if (!deactivateResult) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing giftCardDeactivate in Shopify GraphQL response'
            });
        }

        const userErrors = deactivateResult.userErrors ?? [];

        if (userErrors.length > 0) {
            return {
                user_errors: userErrors
            };
        }

        if (!deactivateResult.giftCard) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing gift card in response'
            });
        }

        const parsedGiftCard = ProviderGiftCardSchema.safeParse(deactivateResult.giftCard);
        if (!parsedGiftCard.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid gift card data in response'
            });
        }

        const card = parsedGiftCard.data;

        return {
            gift_card: {
                id: card.id,
                enabled: card.enabled,
                ...(card.deactivatedAt !== undefined && { deactivated_at: card.deactivatedAt }),
                ...(card.balance !== undefined && {
                    balance: {
                        amount: card.balance.amount,
                        currency_code: card.balance.currencyCode
                    }
                }),
                ...(card.initialValue !== undefined && {
                    initial_value: {
                        amount: card.initialValue.amount,
                        currency_code: card.initialValue.currencyCode
                    }
                }),
                ...(card.maskedCode !== undefined && { masked_code: card.maskedCode }),
                ...(card.lastCharacters !== undefined && { last_characters: card.lastCharacters }),
                ...(card.expiresOn !== undefined && { expires_on: card.expiresOn }),
                ...(card.note !== undefined && { note: card.note }),
                ...(card.createdAt !== undefined && { created_at: card.createdAt }),
                ...(card.updatedAt !== undefined && { updated_at: card.updatedAt })
            },
            user_errors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
