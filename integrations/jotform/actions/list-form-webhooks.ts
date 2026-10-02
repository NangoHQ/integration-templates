import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the Jotform form to list webhooks for. Example: "262715780901055"')
    })
    .describe('Input for listing the webhooks registered on a Jotform form.');

const WebhookSchema = z
    .object({
        index: z.string().describe('Positional index of the webhook within the form. Example: "0"'),
        url: z.string().describe('Registered webhook URL. Example: "https://example.com/webhook"')
    })
    .describe('A single webhook registered on the form.');

const OutputSchema = z
    .object({
        webhooks: z.array(WebhookSchema).describe('Webhook URLs currently registered on the form. Empty when the form has no webhooks.')
    })
    .describe('Webhooks currently registered on the Jotform form.');

const ProviderResponseSchema = z.object({
    content: z.record(z.string(), z.string()).optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads the webhooks registered on a form; performs no provider mutations.
 * @pitfalls: The index is a positional label, not a persistent webhook ID - indexes shift whenever a webhook is added or removed, so re-list before using an index to delete a webhook.
 */
const action = createAction({
    description: 'List webhook URLs currently registered on a form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/ (GET /form/{id}/webhooks)
            endpoint: `/form/${encodeURIComponent(input.form_id)}/webhooks`,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const content = parsed.content ?? {};

        return {
            webhooks: Object.entries(content).map(([index, url]) => ({ index, url }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
