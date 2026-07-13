import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the draft invoice to send. Example: "INV2-XXXX-XXXX-XXXX-XXXX"'),
    send_to_recipient: z.boolean().optional().describe('Whether to email the invoice to the recipient. Default: true'),
    send_to_invoicer: z.boolean().optional().describe('Whether to email a copy to the invoicer. Default: false')
});

const OutputSchema = z.object({
    href: z.string().optional(),
    rel: z.string().optional(),
    method: z.string().optional()
});

const action = createAction({
    description: 'Send an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/invoicing/invoices/readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.send_to_recipient !== undefined) {
            data['send_to_recipient'] = input.send_to_recipient;
        }
        if (input.send_to_invoicer !== undefined) {
            data['send_to_invoicer'] = input.send_to_invoicer;
        }

        const config: ProxyConfiguration = {
            // https://developer.paypal.com/api/rest/
            endpoint: `/v2/invoicing/invoices/${encodeURIComponent(input.invoice_id)}/send`,
            data,
            retries: 3
        };

        const response = await nango.post(config);
        const responseData: unknown = response.data;
        const parsed = OutputSchema.safeParse(responseData);

        if (parsed.success) {
            return parsed.data;
        }

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
