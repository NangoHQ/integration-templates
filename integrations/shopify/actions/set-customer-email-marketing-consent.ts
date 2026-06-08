import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('Shopify customer ID. Example: "gid://shopify/Customer/1234567890" or "1234567890"'),
    marketing_state: z.enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'PENDING']).describe('The email marketing state to set.'),
    consent_updated_at: z.string().optional().describe('The latest ISO date and time when the customer consented or objected. Example: "2026-01-15T10:00:00Z"'),
    marketing_opt_in_level: z.string().optional().describe('The opt-in level at the time of subscribing. Example: "CONFIRMED_OPT_IN"'),
    source_location_id: z.string().optional().describe('The location ID where the customer consented. Example: "gid://shopify/Location/1234567890"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        customerEmailMarketingConsentUpdate: z.object({
            userErrors: z.array(
                z.object({
                    field: z.array(z.string()),
                    message: z.string()
                })
            ),
            customer: z
                .object({
                    id: z.string(),
                    email: z.string().optional(),
                    displayName: z.string().optional(),
                    emailMarketingConsent: z
                        .object({
                            consentUpdatedAt: z.string().optional(),
                            marketingOptInLevel: z.string().optional(),
                            marketingState: z.string().optional()
                        })
                        .optional()
                })
                .optional()
                .nullable()
        })
    })
});

const OutputSchema = z.object({
    customer_id: z.string(),
    email: z.string().optional(),
    display_name: z.string().optional(),
    marketing_state: z.string().optional(),
    consent_updated_at: z.string().optional(),
    marketing_opt_in_level: z.string().optional()
});

const action = createAction({
    description: 'Update email marketing consent for a Shopify customer.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/set-customer-email-marketing-consent',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const customerId = input.customer_id.startsWith('gid://shopify/Customer/') ? input.customer_id : `gid://shopify/Customer/${input.customer_id}`;

        const emailMarketingConsent: {
            marketingState: string;
            consentUpdatedAt?: string;
            marketingOptInLevel?: string;
            sourceLocationId?: string;
        } = {
            marketingState: input.marketing_state
        };

        if (input.consent_updated_at !== undefined) {
            emailMarketingConsent.consentUpdatedAt = input.consent_updated_at;
        }

        if (input.marketing_opt_in_level !== undefined) {
            emailMarketingConsent.marketingOptInLevel = input.marketing_opt_in_level;
        }

        if (input.source_location_id !== undefined) {
            emailMarketingConsent.sourceLocationId = input.source_location_id;
        }

        // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/customerEmailMarketingConsentUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query: `
                    mutation customerEmailMarketingConsentUpdate($input: CustomerEmailMarketingConsentUpdateInput!) {
                        customerEmailMarketingConsentUpdate(input: $input) {
                            userErrors {
                                field
                                message
                            }
                            customer {
                                id
                                email
                                displayName
                                emailMarketingConsent {
                                    consentUpdatedAt
                                    marketingOptInLevel
                                    marketingState
                                }
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        customerId: customerId,
                        emailMarketingConsent: emailMarketingConsent
                    }
                }
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data.customerEmailMarketingConsentUpdate;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: result.userErrors.map((e) => e.message).join(', '),
                errors: result.userErrors
            });
        }

        const customer = result.customer;
        if (!customer) {
            return {
                customer_id: customerId
            };
        }

        return {
            customer_id: customer.id,
            ...(customer.email !== undefined && { email: customer.email }),
            ...(customer.displayName !== undefined && { display_name: customer.displayName }),
            ...(customer.emailMarketingConsent?.marketingState !== undefined && {
                marketing_state: customer.emailMarketingConsent.marketingState
            }),
            ...(customer.emailMarketingConsent?.consentUpdatedAt !== undefined && {
                consent_updated_at: customer.emailMarketingConsent.consentUpdatedAt
            }),
            ...(customer.emailMarketingConsent?.marketingOptInLevel !== undefined && {
                marketing_opt_in_level: customer.emailMarketingConsent.marketingOptInLevel
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
