import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().min(1).describe('The ID of the form the webhook is registered on. Example: "262715780901055"'),
        webhook_index: z
            .union([z.string().regex(/^\d+$/, 'webhook_index must be a non-negative integer, e.g. "0".'), z.number().int().min(0)])
            .describe('The zero-based positional index of the webhook on the form, as returned by list-form-webhooks (a string). Example: "0"')
    })
    .describe('Input for removing a webhook from a Jotform form');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the webhook was deleted successfully.')
    })
    .describe('Result of the webhook deletion');

const DeleteWebhookResponseSchema = z.object({
    responseCode: z.number().optional(),
    message: z.string().optional()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a registered webhook from a form, so Jotform stops posting new submission events to that URL.
 * @pitfalls: The webhook is identified by its positional index on the form, not a stable ID, and adding or deleting a webhook shifts the indexes of the remaining ones, so re-list the form's webhooks immediately before deleting when several are registered. The connected Jotform API key must have Full Access; a Read Access key can still list webhooks but the deletion fails with an authorization error.
 */
const action = createAction({
    description: 'Remove a registered webhook from a form by its index.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // Jotform API docs: https://api.jotform.com/docs/ (DELETE /form/{id}/webhooks/{webhookIndex})
            endpoint: `/form/${encodeURIComponent(input.form_id)}/webhooks/${input.webhook_index}`,
            // Index-based delete is not idempotent: a retry after a lost response could delete a different webhook that shifted into the same index, so retries must stay 0.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.delete(config);
        const body = DeleteWebhookResponseSchema.parse(response.data ?? {});

        if (body.responseCode !== undefined && body.responseCode >= 400) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: body.message ?? `Failed to delete webhook ${input.webhook_index} from form ${input.form_id}`,
                form_id: input.form_id,
                webhook_index: input.webhook_index
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
