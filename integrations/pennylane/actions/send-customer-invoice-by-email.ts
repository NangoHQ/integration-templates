import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique identifier of the customer invoice. Example: 25461646082048'),
    recipients: z.array(z.string().email()).optional().describe('Email recipients. If empty, the email will be sent to the customer default email addresses.')
});

const OutputSchema = z.object({
    sent: z.boolean(),
    invoice_id: z.number()
});

const action = createAction({
    description: 'Send a finalized or imported customer invoice by email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Catching 409 Conflict to surface PDF generation retry guidance per Pennylane docs.
        try {
            response = await nango.post({
                // https://pennylane.readme.io/reference/sendbyemailcustomerinvoice
                endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.id))}/send_by_email`,
                data: input.recipients !== undefined ? { recipients: input.recipients } : undefined,
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
                throw new nango.ActionError({
                    type: 'pdf_not_ready',
                    message: 'The invoice PDF has not been generated yet. Please retry the request in a few minutes.',
                    retry_after_seconds: 120,
                    invoice_id: input.id
                });
            }

            throw error;
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'send_failed',
                message: `Failed to send invoice by email. Status: ${response.status}`,
                invoice_id: input.id
            });
        }

        return {
            sent: true,
            invoice_id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
