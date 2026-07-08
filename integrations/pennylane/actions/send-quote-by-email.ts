import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Quote ID. Example: 25461979840512'),
    recipients: z
        .array(z.string().email())
        .optional()
        .describe('Email recipients. If omitted, the email will be sent to the recipient email addresses specified for the customer of this quote.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ProviderErrorSchema = z.object({
    error: z.string(),
    status: z.number()
});

const action = createAction({
    description: 'Send a quote by email',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.recipients !== undefined && input.recipients.length > 0) {
            data['recipients'] = input.recipients;
        }

        const response = await nango.post({
            // https://pennylane.readme.io/reference/sendbyemailquote
            endpoint: `/api/external/v2/quotes/${encodeURIComponent(String(input.id))}/send_by_email`,
            data,
            retries: 1
        });

        if (response.status === 409) {
            const parsed = ProviderErrorSchema.parse(response.data);
            throw new nango.ActionError({
                type: 'pdf_not_ready',
                message: `The quote PDF is not yet generated. Retry in a few minutes. Original error: ${parsed.error}`,
                quote_id: input.id
            });
        }

        if (response.status < 200 || response.status >= 300) {
            const parsed = ProviderErrorSchema.safeParse(response.data);
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.success ? parsed.data.error : `Unexpected ${response.status} response from provider.`,
                quote_id: input.id,
                status: response.status
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
