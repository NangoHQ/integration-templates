import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to cancel. Example: "INV2-XXX-XXX"')
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
            retries: 3
        };

        await nango.post(config);

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
