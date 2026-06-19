import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    initialValue: z.string().describe('The initial value of the gift card. Example: "100.0"'),
    code: z.string().optional().describe('The gift card code. Must be 8-20 alphanumeric characters. Example: "ABCD1234"'),
    expiresOn: z.string().optional().describe('The expiration date of the gift card in ISO 8601 format (YYYY-MM-DD). Example: "2026-12-31"'),
    customerId: z.string().optional().describe('The ID of the customer to assign the gift card to. Example: "gid://shopify/Customer/123456789"'),
    note: z.string().optional().describe('An internal note associated with the gift card. Example: "Refund for Order #1"'),
    templateSuffix: z.string().optional().describe('The suffix of the Liquid template used to render the gift card online. Example: "birthday"')
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string().optional()
});

const GiftCardSchema = z.object({
    id: z.string(),
    balance: MoneyV2Schema.nullable().optional(),
    initialValue: MoneyV2Schema.nullable().optional(),
    expiresOn: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    customer: z.object({ id: z.string().optional() }).nullable().optional(),
    enabled: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    lastCharacters: z.string().optional(),
    maskedCode: z.string().optional(),
    templateSuffix: z.string().nullable().optional()
});

const GiftCardUserErrorSchema = z.object({
    message: z.string(),
    field: z.array(z.string()).nullable().optional(),
    code: z.string().nullable().optional()
});

const OutputSchema = z.object({
    giftCard: z
        .object({
            id: z.string(),
            balance: z
                .object({
                    amount: z.string(),
                    currencyCode: z.string().optional()
                })
                .optional(),
            initialValue: z
                .object({
                    amount: z.string(),
                    currencyCode: z.string().optional()
                })
                .optional(),
            expiresOn: z.string().optional(),
            note: z.string().optional(),
            customerId: z.string().optional(),
            enabled: z.boolean().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional(),
            lastCharacters: z.string().optional(),
            maskedCode: z.string().optional(),
            templateSuffix: z.string().optional()
        })
        .nullable()
        .optional(),
    giftCardCode: z.string().nullable().optional(),
    userErrors: z.array(
        z.object({
            message: z.string(),
            field: z.array(z.string()).optional(),
            code: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Create a Shopify gift card.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_gift_cards', 'read_gift_cards'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: {
            input: {
                initialValue: string;
                code?: string;
                expiresOn?: string;
                customerId?: string;
                note?: string;
                templateSuffix?: string;
            };
        } = {
            input: {
                initialValue: input.initialValue
            }
        };

        if (input.code !== undefined) {
            variables.input.code = input.code;
        }
        if (input.expiresOn !== undefined) {
            variables.input.expiresOn = input.expiresOn;
        }
        if (input.customerId !== undefined) {
            variables.input.customerId = input.customerId;
        }
        if (input.note !== undefined) {
            variables.input.note = input.note;
        }
        if (input.templateSuffix !== undefined) {
            variables.input.templateSuffix = input.templateSuffix;
        }

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/giftCardCreate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `mutation giftCardCreate($input: GiftCardCreateInput!) {
    giftCardCreate(input: $input) {
        giftCard {
            id
            balance {
                amount
                currencyCode
            }
            initialValue {
                amount
                currencyCode
            }
            expiresOn
            note
            customer {
                id
            }
            enabled
            createdAt
            updatedAt
            lastCharacters
            maskedCode
            templateSuffix
        }
        giftCardCode
        userErrors {
            message
            field
            code
        }
    }
}`,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const payload = z
            .object({
                data: z.object({
                    giftCardCreate: z.object({
                        giftCard: GiftCardSchema.nullable().optional(),
                        giftCardCode: z.string().nullable().optional(),
                        userErrors: z.array(GiftCardUserErrorSchema)
                    })
                })
            })
            .parse(response.data);

        const result = payload.data.giftCardCreate;
        const giftCard = result.giftCard;

        return {
            ...(giftCard != null && {
                giftCard: {
                    id: giftCard.id,
                    ...(giftCard.balance != null && {
                        balance: {
                            amount: giftCard.balance.amount,
                            ...(giftCard.balance.currencyCode != null && { currencyCode: giftCard.balance.currencyCode })
                        }
                    }),
                    ...(giftCard.initialValue != null && {
                        initialValue: {
                            amount: giftCard.initialValue.amount,
                            ...(giftCard.initialValue.currencyCode != null && { currencyCode: giftCard.initialValue.currencyCode })
                        }
                    }),
                    ...(giftCard.expiresOn != null && { expiresOn: giftCard.expiresOn }),
                    ...(giftCard.note != null && { note: giftCard.note }),
                    ...(giftCard.customer?.id != null && { customerId: giftCard.customer.id }),
                    ...(giftCard.enabled != null && { enabled: giftCard.enabled }),
                    ...(giftCard.createdAt != null && { createdAt: giftCard.createdAt }),
                    ...(giftCard.updatedAt != null && { updatedAt: giftCard.updatedAt }),
                    ...(giftCard.lastCharacters != null && { lastCharacters: giftCard.lastCharacters }),
                    ...(giftCard.maskedCode != null && { maskedCode: giftCard.maskedCode }),
                    ...(giftCard.templateSuffix != null && { templateSuffix: giftCard.templateSuffix })
                }
            }),
            ...(result.giftCardCode != null && { giftCardCode: result.giftCardCode }),
            userErrors: result.userErrors.map((err) => ({
                message: err.message,
                ...(err.field != null && { field: err.field }),
                ...(err.code != null && { code: err.code })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
