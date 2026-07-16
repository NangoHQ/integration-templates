import { z } from 'zod';
import { createAction } from 'nango';

const SquareErrorSchema = z.object({
    category: z.string().optional(),
    code: z.string(),
    detail: z.string().optional(),
    field: z.string().optional()
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
        payment_requests: z.array(z.object({}).passthrough()).optional(),
        primary_recipient: z.object({}).passthrough().optional(),
        accepted_payment_methods: z.object({}).passthrough().optional(),
        custom_fields: z.array(z.object({}).passthrough()).optional(),
        delivery_method: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const GetInvoiceResponseSchema = z.object({
    invoice: InvoiceSchema.optional(),
    errors: z.array(SquareErrorSchema).optional()
});

const UpdateInvoiceResponseSchema = z.object({
    invoice: InvoiceSchema.optional(),
    errors: z.array(SquareErrorSchema).optional()
});

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to update. Example: "inv:0-ChClKzUTL1Ssf3Kybdil5LEXEL4I"'),
    invoice: z.object({}).passthrough().describe('The invoice fields to add, change, or clear.'),
    idempotency_key: z.string().optional().describe('A unique string that identifies this request for idempotency.')
});

const OutputSchema = InvoiceSchema;

const action = createAction({
    description: 'Update a draft or unpaid invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['INVOICES_WRITE', 'ORDERS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.squareup.com/reference/square/invoices-api/get-invoice
        const getResponse = await nango.get({
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}`,
            retries: 3
        });

        const getData = GetInvoiceResponseSchema.parse(getResponse.data);
        if (!getData.invoice) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found',
                invoice_id: input.invoice_id
            });
        }

        const currentVersion = getData.invoice.version;

        // https://developer.squareup.com/reference/square/invoices-api/update-invoice
        const updateResponse = await nango.put({
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}`,
            data: {
                ...(input.idempotency_key !== undefined && { idempotency_key: input.idempotency_key }),
                invoice: {
                    ...input.invoice,
                    version: currentVersion
                }
            },
            retries: input.idempotency_key !== undefined ? 3 : 0
        });

        const updateData = UpdateInvoiceResponseSchema.parse(updateResponse.data);
        if (!updateData.invoice) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update invoice',
                errors: updateData.errors
            });
        }

        return updateData.invoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
