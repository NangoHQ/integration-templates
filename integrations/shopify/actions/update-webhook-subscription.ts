import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the webhook subscription to update. Example: "gid://shopify/WebhookSubscription/123"'),
    filter: z.string().nullable().optional().describe('A constraint using search syntax to filter webhooks.'),
    format: z.string().nullable().optional().describe('The format in which the webhook subscription should send the data.'),
    includeFields: z.array(z.string()).nullable().optional().describe('The list of fields to be included in the webhook subscription.'),
    metafieldNamespaces: z.array(z.string()).nullable().optional().describe('The list of namespaces for metafields to include in the webhook subscription.'),
    name: z.string().nullable().optional().describe('A human-readable name for the webhook subscription.'),
    uri: z.string().nullable().optional().describe('The URI where the webhook subscription should send events.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const WebhookSubscriptionSchema = z.object({
    id: z.string(),
    topic: z.string(),
    uri: z.string(),
    filter: z.string().nullable().optional(),
    format: z.string(),
    name: z.string().nullable().optional(),
    includeFields: z.array(z.string()).optional(),
    metafieldNamespaces: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    webhookSubscription: WebhookSubscriptionSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Update a Shopify webhook subscription.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation webhookSubscriptionUpdate($id: ID!, $webhookSubscription: WebhookSubscriptionInput!) {
                webhookSubscriptionUpdate(id: $id, webhookSubscription: $webhookSubscription) {
                    userErrors {
                        field
                        message
                    }
                    webhookSubscription {
                        id
                        topic
                        uri
                        filter
                        format
                        name
                        includeFields
                        metafieldNamespaces
                    }
                }
            }
        `;

        const webhookSubscription: Record<string, unknown> = {};

        if (input.filter !== undefined) {
            webhookSubscription['filter'] = input.filter;
        }
        if (input.format !== undefined) {
            webhookSubscription['format'] = input.format;
        }
        if (input.includeFields !== undefined) {
            webhookSubscription['includeFields'] = input.includeFields;
        }
        if (input.metafieldNamespaces !== undefined) {
            webhookSubscription['metafieldNamespaces'] = input.metafieldNamespaces;
        }
        if (input.name !== undefined) {
            webhookSubscription['name'] = input.name;
        }
        if (input.uri !== undefined) {
            webhookSubscription['uri'] = input.uri;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/webhookSubscriptionUpdate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id,
                    webhookSubscription
                }
            },
            retries: 3
        });

        const responseBody = z
            .object({
                data: z
                    .object({
                        webhookSubscriptionUpdate: z
                            .object({
                                userErrors: z.array(
                                    z.object({
                                        field: z.array(z.string()).optional(),
                                        message: z.string()
                                    })
                                ),
                                webhookSubscription: WebhookSubscriptionSchema.nullable().optional()
                            })
                            .optional()
                    })
                    .optional(),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (responseBody.errors && responseBody.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL request returned errors.',
                errors: responseBody.errors
            });
        }

        const updateResult = responseBody.data?.webhookSubscriptionUpdate;

        if (!updateResult) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return a webhookSubscriptionUpdate result.'
            });
        }

        if (updateResult.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Shopify returned userErrors for the update request.',
                userErrors: updateResult.userErrors
            });
        }

        const subscription = updateResult.webhookSubscription;

        if (!subscription) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook subscription not found after update.'
            });
        }

        return {
            webhookSubscription: {
                id: subscription.id,
                topic: subscription.topic,
                uri: subscription.uri,
                ...(subscription.filter !== undefined && subscription.filter !== null && { filter: subscription.filter }),
                format: subscription.format,
                ...(subscription.name !== undefined && subscription.name !== null && { name: subscription.name }),
                ...(subscription.includeFields !== undefined && { includeFields: subscription.includeFields }),
                ...(subscription.metafieldNamespaces !== undefined && { metafieldNamespaces: subscription.metafieldNamespaces })
            },
            userErrors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
