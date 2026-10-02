import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the form to register the webhook on. Example: "262715780901055"'),
        webhook_url: z
            .string()
            .describe(
                'Fully-qualified http(s) URL that Jotform will POST a submission payload to for every new submission on the form. Example: "https://example.com/jotform-webhook"'
            )
    })
    .describe('Webhook registration request: the target form and the URL to notify.');

const OutputSchema = z
    .object({
        webhook_url: z.string().describe('The webhook URL that was registered on the form.')
    })
    .describe('Confirmation of the registered webhook.');

const AddWebhookResponseSchema = z.object({
    content: z.record(z.string(), z.string())
});

/**
 * @tags: [write]
 * @tagReason: Registers a new webhook URL on the provider form, mutating the form's webhook configuration without reading or deleting anything.
 * @pitfalls: Jotform validates the URL at registration and rejects values it does not accept with a 400 error. Registering a URL that is already registered on the same form also fails with a 400 error instead of succeeding silently.
 */
const action = createAction({
    description: 'Register a new webhook URL on a form so Jotform POSTs new submissions to it',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // webhookURL must be sent as a URL query-string parameter: Jotform silently rejects it with a 400 when sent in the request body.
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#post-form-id-webhooks
            endpoint: `/form/${encodeURIComponent(input.form_id)}/webhooks`,
            params: {
                webhookURL: input.webhook_url
            },
            // Not idempotent: a retry after a lost response could register the same webhook URL twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- this non-idempotent POST deliberately uses 0 retries
            retries: 0
        };
        const response = await nango.post(config);

        const parsed = AddWebhookResponseSchema.parse(response.data);
        const registeredUrl = Object.values(parsed.content).find((url) => url === input.webhook_url);

        if (!registeredUrl) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Jotform did not return the registered webhook URL'
            });
        }

        return {
            webhook_url: registeredUrl
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
