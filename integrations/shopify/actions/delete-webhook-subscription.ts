import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the webhook subscription to delete. Example: "gid://shopify/WebhookSubscription/1234567890"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        webhookSubscriptionDelete: z.object({
            deletedWebhookSubscriptionId: z.string().nullable().optional(),
            userErrors: z.array(UserErrorSchema)
        })
    }),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Delete a Shopify webhook subscription.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders', 'write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation webhookSubscriptionDelete($id: ID!) {
                webhookSubscriptionDelete(id: $id) {
                    deletedWebhookSubscriptionId
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/webhookSubscriptionDelete
        const response = await nango.post({
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL request returned errors',
                errors: parsed.errors
            });
        }

        const result = parsed.data.webhookSubscriptionDelete;

        return {
            ...(result.deletedWebhookSubscriptionId != null && { id: result.deletedWebhookSubscriptionId }),
            userErrors: result.userErrors.map((error) => ({
                ...(error.field !== undefined && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
