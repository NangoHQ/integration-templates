import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    topic: z.string().describe('The webhook topic enum value. Example: ORDERS_CREATE'),
    webhookSubscription: z.object({
        callbackUrl: z.string().describe('The HTTPS URL to send webhooks to'),
        format: z.string().optional().describe('Payload format (JSON or XML)'),
        includeFields: z.array(z.string()).optional().describe('Fields to include in the webhook payload')
    })
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const WebhookSubscriptionSchema = z.object({
    id: z.string().optional(),
    topic: z.string().optional(),
    callbackUrl: z.string().optional(),
    format: z.string().optional(),
    includeFields: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    webhookSubscription: WebhookSubscriptionSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            webhookSubscriptionCreate: z
                .object({
                    webhookSubscription: z.unknown().optional(),
                    userErrors: z.unknown().optional()
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Create a webhook subscription in Shopify.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-webhook-subscription',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
                webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
                    webhookSubscription {
                        id
                        topic
                        callbackUrl
                        format
                        includeFields
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            topic: input.topic,
            webhookSubscription: {
                callbackUrl: input.webhookSubscription.callbackUrl,
                ...(input.webhookSubscription.format !== undefined && { format: input.webhookSubscription.format }),
                ...(input.webhookSubscription.includeFields !== undefined && { includeFields: input.webhookSubscription.includeFields })
            }
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/webhookSubscriptionCreate
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL API returned errors',
                errors: parsed.errors
            });
        }

        const payload = parsed.data?.webhookSubscriptionCreate;

        if (!payload) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        const userErrors = z.array(UserErrorSchema).parse(payload.userErrors || []);

        if (userErrors.length > 0) {
            return {
                userErrors
            };
        }

        const rawSubscription = payload.webhookSubscription;
        const subscription = rawSubscription ? WebhookSubscriptionSchema.parse(rawSubscription) : undefined;

        return {
            ...(subscription && { webhookSubscription: subscription }),
            userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
