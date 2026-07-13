import { z } from 'zod';
import { createAction } from 'nango';

const AmountSchema = z.object({
    currency_code: z.string().describe('Currency code. Example: "USD"'),
    value: z.string().describe('Amount value. Example: "100.00"')
});

const PurchaseUnitSchema = z
    .object({
        reference_id: z.string().optional().describe('Reference ID for the purchase unit. Example: "d9f80740-38f0-11e8-b467-0ed5f89f718b"'),
        description: z.string().optional().describe('Description of the purchase unit.'),
        amount: AmountSchema,
        custom_id: z.string().optional().describe('Custom ID for the purchase unit.'),
        invoice_id: z.string().optional().describe('Invoice ID for the purchase unit.'),
        soft_descriptor: z.string().optional().describe('Soft descriptor for the purchase unit.'),
        items: z.array(z.record(z.string(), z.unknown())).optional().describe('Line items for the purchase unit.')
    })
    .passthrough();

const ApplicationContextSchema = z
    .object({
        brand_name: z.string().optional().describe('Brand name.'),
        locale: z.string().optional().describe('Locale.'),
        landing_page: z.string().optional().describe('Landing page.'),
        shipping_preference: z.string().optional().describe('Shipping preference.'),
        user_action: z.string().optional().describe('User action.'),
        return_url: z.string().optional().describe('Return URL after payer approval.'),
        cancel_url: z.string().optional().describe('Cancel URL if payer cancels.')
    })
    .passthrough();

const InputSchema = z.object({
    intent: z.enum(['CAPTURE', 'AUTHORIZE']).describe('The intent to capture or authorize payment.'),
    purchase_units: z.array(PurchaseUnitSchema).describe('An array of purchase units.'),
    payment_source: z.record(z.string(), z.unknown()).optional().describe('The payment source definition.'),
    application_context: ApplicationContextSchema.optional().describe('Customizes the payer experience during approval.')
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const ProviderOrderSchema = z.object({
    id: z.string(),
    status: z.string(),
    intent: z.string().optional(),
    purchase_units: z.array(z.record(z.string(), z.unknown())).optional(),
    payment_source: z.record(z.string(), z.unknown()).optional(),
    payer: z.record(z.string(), z.unknown()).optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The order ID.'),
    status: z.string().describe('The order status.'),
    intent: z.string().optional().describe('The order intent.'),
    purchase_units: z.array(z.record(z.string(), z.unknown())).optional().describe('The purchase units.'),
    payment_source: z.record(z.string(), z.unknown()).optional().describe('The payment source.'),
    payer: z.record(z.string(), z.unknown()).optional().describe('The payer information.'),
    create_time: z.string().optional().describe('The creation time.'),
    update_time: z.string().optional().describe('The last update time.'),
    links: z.array(LinkSchema).optional().describe('HATEOAS links.')
});

const action = createAction({
    description: 'Create an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/payments/payment'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/api/orders/v2/#orders_create
            endpoint: '/v2/checkout/orders',
            data: {
                intent: input.intent,
                purchase_units: input.purchase_units,
                ...(input.payment_source !== undefined && { payment_source: input.payment_source }),
                ...(input.application_context !== undefined && { application_context: input.application_context })
            },
            retries: 10
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from PayPal.'
            });
        }

        const providerOrder = ProviderOrderSchema.parse(response.data);

        return {
            id: providerOrder.id,
            status: providerOrder.status,
            ...(providerOrder.intent !== undefined && { intent: providerOrder.intent }),
            ...(providerOrder.purchase_units !== undefined && { purchase_units: providerOrder.purchase_units }),
            ...(providerOrder.payment_source !== undefined && { payment_source: providerOrder.payment_source }),
            ...(providerOrder.payer !== undefined && { payer: providerOrder.payer }),
            ...(providerOrder.create_time !== undefined && { create_time: providerOrder.create_time }),
            ...(providerOrder.update_time !== undefined && { update_time: providerOrder.update_time }),
            ...(providerOrder.links !== undefined && { links: providerOrder.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
