import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the draft invoice to publish. Example: "inv:0-ChCOCo8Wfl5qlQMMklqY-IpxEL4I"')
});

const InvoiceSchema = z
    .object({
        id: z.string(),
        version: z.number(),
        location_id: z.string(),
        order_id: z.string().optional(),
        status: z.string(),
        invoice_number: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        scheduled_at: z.string().optional(),
        timezone: z.string().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        primary_recipient: z.record(z.string(), z.unknown()).optional(),
        public_url: z.string().optional(),
        accepted_payment_methods: z.record(z.string(), z.unknown()).optional(),
        delivery_method: z.string().optional(),
        payment_requests: z.array(z.record(z.string(), z.unknown())).optional(),
        custom_fields: z.array(z.record(z.string(), z.unknown())).optional(),
        sale_or_service_date: z.string().optional(),
        store_payment_method_enabled: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    invoice: InvoiceSchema
});

const action = createAction({
    description: 'Publish a draft invoice, moving it out of DRAFT status and sending it to the recipient.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['INVOICES_WRITE', 'ORDERS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.squareup.com/reference/square/invoices-api/get-invoice
        const getConfig: Omit<ProxyConfiguration, 'method'> = {
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}`,
            retries: 3
        };
        const getResponse = await nango.get(getConfig);

        const getData = z
            .object({
                invoice: z.record(z.string(), z.unknown())
            })
            .parse(getResponse.data);

        const invoice = InvoiceSchema.parse(getData.invoice);

        if (invoice.status !== 'DRAFT') {
            throw new nango.ActionError({
                type: 'invalid_status',
                message: `Invoice must be in DRAFT status to publish. Current status: ${invoice.status}`,
                invoice_id: input.invoice_id,
                status: invoice.status
            });
        }

        // https://developer.squareup.com/reference/square/invoices-api/publish-invoice
        const publishConfig: Omit<ProxyConfiguration, 'method'> = {
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}/publish`,
            data: {
                version: invoice.version
            },
            retries: 10
        };
        const publishResponse = await nango.post(publishConfig);

        const publishData = z
            .object({
                invoice: z.record(z.string(), z.unknown())
            })
            .parse(publishResponse.data);

        const publishedInvoice = InvoiceSchema.parse(publishData.invoice);

        return {
            invoice: publishedInvoice
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
