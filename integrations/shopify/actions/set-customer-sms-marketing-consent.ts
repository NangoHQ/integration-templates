import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const MarketingStateEnum = z.enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'NOT_SUBSCRIBED', 'PENDING', 'REDACTED']);

const MarketingOptInLevelEnum = z.enum(['CONFIRMED_OPT_IN', 'SINGLE_OPT_IN', 'UNKNOWN']);

const SmsMarketingConsentInputSchema = z.object({
    marketingState: MarketingStateEnum.describe('The current SMS marketing state for the customer.'),
    marketingOptInLevel: MarketingOptInLevelEnum.optional().describe('The marketing subscription opt-in level.'),
    consentUpdatedAt: z.string().optional().describe('The date and time when the customer consented. ISO 8601 format. Example: "2021-01-07T15:50:00Z"'),
    sourceLocationId: z.string().optional().describe('The location ID where consent was collected.')
});

const InputSchema = z.object({
    customerId: z.string().describe('The ID of the customer to update. Example: "gid://shopify/Customer/207119551"'),
    smsMarketingConsent: SmsMarketingConsentInputSchema
});

const ProviderSmsMarketingConsentSchema = z.object({
    marketingState: z.string().optional(),
    marketingOptInLevel: z.string().nullable().optional(),
    consentUpdatedAt: z.string().nullable().optional(),
    consentCollectedFrom: z.string().optional()
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    phone: z.string().nullable().optional(),
    smsMarketingConsent: ProviderSmsMarketingConsentSchema.nullable().optional()
});

const ResponseBodySchema = z.object({
    data: z
        .object({
            customerSmsMarketingConsentUpdate: z.object({
                userErrors: z
                    .array(
                        z.object({
                            field: z.array(z.string()).nullable().optional(),
                            message: z.string()
                        })
                    )
                    .optional(),
                customer: ProviderCustomerSchema.nullable().optional()
            })
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    phone: z.string().optional(),
    smsMarketingConsent: z
        .object({
            marketingState: z.string().optional(),
            marketingOptInLevel: z.string().optional(),
            consentUpdatedAt: z.string().optional(),
            consentCollectedFrom: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update SMS marketing consent for a Shopify customer.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/customerSmsMarketingConsentUpdate
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    mutation customerSmsMarketingConsentUpdate($input: CustomerSmsMarketingConsentUpdateInput!) {
                        customerSmsMarketingConsentUpdate(input: $input) {
                            userErrors {
                                field
                                message
                            }
                            customer {
                                id
                                phone
                                smsMarketingConsent {
                                    marketingState
                                    marketingOptInLevel
                                    consentUpdatedAt
                                    consentCollectedFrom
                                }
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        customerId: input.customerId,
                        smsMarketingConsent: {
                            marketingState: input.smsMarketingConsent.marketingState,
                            ...(input.smsMarketingConsent.marketingOptInLevel !== undefined && {
                                marketingOptInLevel: input.smsMarketingConsent.marketingOptInLevel
                            }),
                            ...(input.smsMarketingConsent.consentUpdatedAt !== undefined && {
                                consentUpdatedAt: input.smsMarketingConsent.consentUpdatedAt
                            }),
                            ...(input.smsMarketingConsent.sourceLocationId !== undefined && {
                                sourceLocationId: input.smsMarketingConsent.sourceLocationId
                            })
                        }
                    }
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const body = ResponseBodySchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: body.errors.map((err) => err.message).join('; ')
            });
        }

        const result = body.data?.customerSmsMarketingConsentUpdate;
        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify GraphQL API.'
            });
        }

        if (result.userErrors && result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: result.userErrors.map((err) => err.message).join('; '),
                errors: result.userErrors
            });
        }

        const customer = result.customer;
        if (!customer) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found or could not be updated.'
            });
        }

        const consent = customer.smsMarketingConsent;

        return {
            id: customer.id,
            ...(customer.phone != null && { phone: customer.phone }),
            ...(consent != null && {
                smsMarketingConsent: {
                    ...(consent.marketingState != null && { marketingState: consent.marketingState }),
                    ...(consent.marketingOptInLevel != null && { marketingOptInLevel: consent.marketingOptInLevel }),
                    ...(consent.consentUpdatedAt != null && { consentUpdatedAt: consent.consentUpdatedAt }),
                    ...(consent.consentCollectedFrom != null && { consentCollectedFrom: consent.consentCollectedFrom })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
