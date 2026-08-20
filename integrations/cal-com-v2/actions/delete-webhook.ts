import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        webhookId: z.string().describe('The unique identifier of the webhook to delete. Example: "123".')
    })
    .describe('Input for deleting a Cal.com webhook.');

const ProviderWebhookSchema = z.object({
    id: z.string(),
    userId: z.number().optional(),
    subscriberUrl: z.string(),
    active: z.boolean(),
    triggers: z.array(z.string()),
    payloadTemplate: z.string().nullable().optional(),
    secret: z.string().nullable().optional(),
    time: z.number().nullable().optional(),
    timeUnit: z.string().nullable().optional(),
    version: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the deleted webhook.'),
        subscriberUrl: z.string().describe('The URL that was receiving webhook events.'),
        active: z.boolean().describe('Whether the webhook was active at the time of deletion.'),
        triggers: z.array(z.string()).describe('The event triggers that were configured for this webhook.')
    })
    .describe('The Cal.com webhook that was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a webhook from the Cal.com account.
 * @pitfalls: The provider permanently deletes webhooks immediately with no archive or recovery option, and the action returns the final snapshot of the deleted webhook rather than a bare success confirmation.
 */
const action = createAction({
    description: 'Delete a webhook in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['WEBHOOK_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Cal.com returns 404 for
        // a non-existent/already-deleted webhook, which we convert into a not_found error.
        try {
            response = await nango.delete({
                // https://cal.com/docs/api-reference/v2/webhooks/delete-a-webhook
                endpoint: `/webhooks/${encodeURIComponent(input.webhookId)}`,
                retries: 10
            });
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const errResponse = err.response;
                if (typeof errResponse === 'object' && errResponse !== null && 'status' in errResponse && errResponse.status === 404) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: 'Webhook not found or already deleted.',
                        webhookId: input.webhookId
                    });
                }
            }
            throw err;
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found or already deleted.',
                webhookId: input.webhookId
            });
        }

        const envelope = z
            .object({
                status: z.string(),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (envelope.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com returned an error status when deleting the webhook.',
                webhookId: input.webhookId
            });
        }

        const webhook = ProviderWebhookSchema.parse(envelope.data);

        return {
            id: webhook.id,
            subscriberUrl: webhook.subscriberUrl,
            active: webhook.active,
            triggers: webhook.triggers
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
