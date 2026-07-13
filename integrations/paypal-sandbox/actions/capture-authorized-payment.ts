import { z } from 'zod';
import { createAction } from 'nango';

const AmountSchema = z.object({
    currency_code: z.string().describe('The currency code. Example: "USD"'),
    value: z.string().describe('The amount value. Example: "10.00"')
});

const InputSchema = z.object({
    authorization_id: z.string().describe('The PayPal authorization ID to capture. Example: "4G179338Y2426871A"'),
    amount: AmountSchema.optional().describe('The amount to capture. If omitted, captures the full authorized amount.'),
    invoice_id: z.string().optional().describe('The API caller-provided external invoice number for this capture.'),
    note_to_payer: z.string().optional().describe('An informational note about this capture displayed to the payer.'),
    final_capture: z.boolean().optional().describe('Indicates whether this is the final capture for the authorization.')
});

const ProviderCaptureSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        amount: AmountSchema,
        final_capture: z.boolean().optional(),
        seller_protection: z
            .object({
                status: z.string()
            })
            .optional(),
        seller_receivable_breakdown: z.record(z.string(), z.unknown()).optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional(),
        links: z.array(z.record(z.string(), z.unknown())).optional(),
        network_transaction_reference: z.record(z.string(), z.unknown()).optional(),
        processor_response: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    amount: AmountSchema,
    final_capture: z.boolean().optional(),
    seller_protection_status: z.string().optional(),
    seller_receivable_breakdown: z.record(z.string(), z.unknown()).optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Capture funds for a previously authorized payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/payments/payment'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/docs/api/payments/v2/#authorizations_capture
            endpoint: `/v2/payments/authorizations/${encodeURIComponent(input.authorization_id)}/capture`,
            data: {
                ...(input.amount !== undefined && { amount: input.amount }),
                ...(input.invoice_id !== undefined && { invoice_id: input.invoice_id }),
                ...(input.note_to_payer !== undefined && { note_to_payer: input.note_to_payer }),
                ...(input.final_capture !== undefined && { final_capture: input.final_capture })
            },
            headers: {
                Prefer: 'return=representation'
            },
            retries: 10
        });

        const providerCapture = ProviderCaptureSchema.parse(response.data);

        return {
            id: providerCapture.id,
            status: providerCapture.status,
            amount: providerCapture.amount,
            ...(providerCapture.final_capture !== undefined && { final_capture: providerCapture.final_capture }),
            ...(providerCapture.seller_protection !== undefined && { seller_protection_status: providerCapture.seller_protection.status }),
            ...(providerCapture.seller_receivable_breakdown !== undefined && { seller_receivable_breakdown: providerCapture.seller_receivable_breakdown }),
            ...(providerCapture.create_time !== undefined && { create_time: providerCapture.create_time }),
            ...(providerCapture.update_time !== undefined && { update_time: providerCapture.update_time }),
            ...(providerCapture.links !== undefined && { links: providerCapture.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
