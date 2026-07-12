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

        // @allowTryCatch Catching 409 Conflict to surface PDF generation retry guidance per Pennylane docs.
        try {
            await nango.post({
                // https://pennylane.readme.io/reference/sendbyemailquote
                endpoint: `/api/external/v2/quotes/${encodeURIComponent(String(input.id))}/send_by_email`,
                data,
                retries: 1
            });
        } catch (error) {
            const errorSchema = z.object({
                response: z.object({
                    status: z.number(),
                    data: z.unknown()
                })
            });

            const parsed = errorSchema.safeParse(error);
            if (parsed.success && parsed.data.response.status === 409) {
                const providerError = ProviderErrorSchema.safeParse(parsed.data.response.data);
                throw new nango.ActionError({
                    type: 'pdf_not_ready',
                    message: `The quote PDF is not yet generated. Retry in a few minutes.${providerError.success ? ` Original error: ${providerError.data.error}` : ''}`,
                    quote_id: input.id
                });
            }

            if (parsed.success) {
                const providerError = ProviderErrorSchema.safeParse(parsed.data.response.data);
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: providerError.success ? providerError.data.error : `Unexpected ${parsed.data.response.status} response from provider.`,
                    quote_id: input.id,
                    status: parsed.data.response.status
                });
            }

            throw error;
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
