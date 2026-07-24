import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    formId: z.string().describe('Unique ID for the form. Example: "u6nXL7"'),
    tag: z.string().describe('Unique name for the webhook. Example: "my-webhook"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.typeform.com/developers/webhooks/reference/delete-webhook/
            endpoint: `/forms/${encodeURIComponent(input.formId)}/webhooks/${encodeURIComponent(input.tag)}`,
            retries: 2
        };

        // @allowTryCatch Map provider 404 to a structured ActionError so callers know the webhook does not exist.
        try {
            await nango.delete(config);
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'status' in error.response &&
                error.response.status === 404
            ) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Webhook with tag "${input.tag}" not found for form "${input.formId}".`
                });
            }
            throw error;
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
