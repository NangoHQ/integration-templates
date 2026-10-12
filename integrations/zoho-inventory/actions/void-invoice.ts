import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const ProviderVoidResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const ProviderInvoiceSchema = z
    .object({
        invoice_id: z.string().optional(),
        invoice_number: z.string().optional(),
        status: z.string().optional()
    })
    .passthrough();

const ProviderInvoiceResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    invoice: ProviderInvoiceSchema.optional()
});

const InputSchema = z
    .object({
        invoice_id: z.string().describe('Zoho Inventory invoice ID to void. Example: "260815000000159198"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for voiding a Zoho Inventory invoice.');

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the invoice that was voided.'),
        invoice_number: z.string().optional().describe('Provider-assigned invoice number. Example: "INV-000043"'),
        status: z.string().optional().describe('Invoice status after voiding. Expected value: "void".'),
        message: z.string().optional().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of voiding a Zoho Inventory invoice.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the invoice to confirm its post-void status after voiding it, a write that permanently invalidates the invoice.
 * @pitfalls: Voiding is idempotent, so re-voiding an already-void invoice still returns success; it also does not prevent the invoice from being hard-deleted later, so void is not a substitute for deletion.
 */
const action = createAction({
    description: 'Void (cancel) a Zoho Inventory invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.invoices.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/invoices/#void-an-invoice
        // Voiding is idempotent (re-voiding an already-void invoice still succeeds), so retries are safe.
        const voidResponse = await nango.post({
            endpoint: `/inventory/v1/invoices/${encodeURIComponent(input.invoice_id)}/status/void`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerVoid = ProviderVoidResponseSchema.parse(voidResponse.data);
        if (providerVoid.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerVoid.message ?? 'Failed to void the invoice.',
                code: providerVoid.code
            });
        }

        // https://www.zoho.com/inventory/api/v1/invoices/#get-an-invoice
        const invoiceResponse = await nango.get({
            endpoint: `/inventory/v1/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });
        const providerInvoice = ProviderInvoiceResponseSchema.parse(invoiceResponse.data);
        if (providerInvoice.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerInvoice.message ?? 'Failed to retrieve the voided invoice.',
                code: providerInvoice.code
            });
        }
        const invoice = providerInvoice.invoice;

        return {
            invoice_id: input.invoice_id,
            ...(invoice?.invoice_number != null && { invoice_number: invoice.invoice_number }),
            ...(invoice?.status != null && { status: invoice.status }),
            ...(providerVoid.message != null && { message: providerVoid.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
