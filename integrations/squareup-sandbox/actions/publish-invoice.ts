import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';
import crypto from 'crypto';

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

const SquareErrorSchema = z.object({
    category: z.string().optional(),
    code: z.string().optional(),
    detail: z.string().optional(),
    field: z.string().optional()
});

// Square error responses (e.g. 404 invoice not found, 409 already published) omit `invoice` and
// return an `errors` array instead, so both fields must be optional here to avoid an opaque Zod
// parse failure when the provider returns an error payload instead of a success payload.
const InvoiceEnvelopeSchema = z.object({
    invoice: InvoiceSchema.optional(),
    errors: z.array(SquareErrorSchema).optional()
});

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

        const getData = InvoiceEnvelopeSchema.parse(getResponse.data);
        if (getData.errors && getData.errors.length > 0) {
            const firstError = getData.errors[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError?.detail || firstError?.code || 'Square API returned an error while fetching the invoice',
                errors: getData.errors
            });
        }
        if (!getData.invoice) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found',
                invoice_id: input.invoice_id
            });
        }

        const invoice = getData.invoice;

        if (invoice.status !== 'DRAFT') {
            throw new nango.ActionError({
                type: 'invalid_status',
                message: `Invoice must be in DRAFT status to publish. Current status: ${invoice.status}`,
                invoice_id: input.invoice_id,
                status: invoice.status
            });
        }

        // Generate a stable idempotency key once per execution so every retry attempt (including
        // ones triggered by a transient network failure that happens AFTER Square already
        // processed the publish) is sent with the same key. Square then returns the original
        // publish result instead of rejecting the retry as "already published".
        // https://developer.squareup.com/reference/square/invoices-api/publish-invoice
        const idempotencyKey = crypto.randomUUID();

        const publishConfig: Omit<ProxyConfiguration, 'method'> = {
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}/publish`,
            data: {
                version: invoice.version,
                idempotency_key: idempotencyKey
            },
            retries: 10
        };
        const publishResponse = await nango.post(publishConfig);

        const publishData = InvoiceEnvelopeSchema.parse(publishResponse.data);
        if (publishData.errors && publishData.errors.length > 0) {
            const firstError = publishData.errors[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError?.detail || firstError?.code || 'Square API returned an error while publishing the invoice',
                errors: publishData.errors
            });
        }
        if (!publishData.invoice) {
            throw new nango.ActionError({
                type: 'missing_invoice',
                message: 'Invoice not returned in the provider response.'
            });
        }

        return {
            invoice: publishData.invoice
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
