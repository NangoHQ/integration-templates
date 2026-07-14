import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to cancel. Example: "INV2-XXX-XXX"'),
    subject: z.string().optional().describe('The subject of the cancellation notification email.'),
    note: z.string().optional().describe('A note to the recipient(s) about the cancellation.'),
    send_to_recipient: z.boolean().optional().describe('Whether to send the cancellation notification to the invoice recipient. Default: true'),
    send_to_invoicer: z.boolean().optional().describe('Whether to send the cancellation notification to the invoicer. Default: false')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Cancel a sent invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.paypal.com/api/invoicing/v2/#invoices_cancel
            endpoint: `/v2/invoicing/invoices/${encodeURIComponent(input.invoice_id)}/cancel`,
            // PayPal requires a JSON body on this endpoint (the cancellation notification object), even when
            // every field is optional and the caller wants the defaults.
            data: {
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.note !== undefined && { note: input.note }),
                ...(input.send_to_recipient !== undefined && { send_to_recipient: input.send_to_recipient }),
                ...(input.send_to_invoicer !== undefined && { send_to_invoicer: input.send_to_invoicer })
            },
            retries: 3
        };

        await nango.post(config);

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
