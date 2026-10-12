import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const LineItemSchema = z
    .object({
        item_id: z.string().optional().describe('Unique ID of the item on the line. Example: "260815000000131008"'),
        line_item_id: z.string().optional().describe('Unique ID of this line item within the purchase order. Example: "260815000000103022"'),
        name: z.string().optional().describe('Name of the line item.'),
        description: z.string().optional().describe('Description of the line item.'),
        item_order: z.number().optional().describe('Zero-based position of the line item in the purchase order.'),
        bcy_rate: z.number().optional().describe("Item rate in the organization's base currency."),
        rate: z.number().optional().describe('Rate of the line item.'),
        purchase_rate: z.number().optional().describe('Purchase price of the line item.'),
        quantity: z.number().optional().describe('Quantity of the line item.'),
        unit: z.string().optional().describe('Unit of measurement for the line item. Example: "qty"'),
        item_total: z.number().optional().describe('Total of the line item (quantity x purchase rate).'),
        account_id: z.string().optional().describe('ID of the account associated with the line item.'),
        account_name: z.string().optional().describe('Name of the account associated with the line item.'),
        tax_id: z.string().optional().describe('ID of the tax applied to the line item.'),
        tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
        tax_type: z.string().optional().describe('Type of the tax, e.g. a single tax or a tax group.'),
        tax_percentage: z.number().optional().describe('Percentage of the tax applied to the line item.'),
        location_id: z.string().optional().describe('ID of the location the item is associated with.')
    })
    .describe('A single line item on the purchase order.');

const CustomFieldSchema = z
    .object({
        customfield_id: z.string().optional().describe('Unique ID of the custom field.'),
        label: z.string().optional().describe('Label of the custom field.'),
        value: z.string().optional().describe('Value of the custom field.')
    })
    .describe('A custom field set on the purchase order.');

const ContactPersonAssociatedSchema = z
    .object({
        contact_person_id: z.string().describe('Unique ID of the contact person.'),
        communication_preference: z
            .object({
                is_email_enabled: z.boolean().optional().describe('Whether email communication is enabled for this contact person.'),
                is_whatsapp_enabled: z.boolean().optional().describe('Whether WhatsApp communication is enabled for this contact person.')
            })
            .optional()
            .describe('Preferred communication modes for this contact person on the transaction.')
    })
    .describe('A contact person associated with the purchase order.');

const InputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique ID of the purchase order to update. Example: "260815000000160127"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        purchaseorder_number: z.string().optional().describe('Purchase order number. Required only when ignore_auto_number_generation is true.'),
        date: z.string().optional().describe('Purchase order date in yyyy-MM-dd format. Example: "2026-10-09"'),
        delivery_date: z.string().optional().describe('Delivery date in yyyy-MM-dd format.'),
        expected_delivery_date: z.string().optional().describe('Expected delivery date in yyyy-MM-dd format.'),
        reference_number: z.string().optional().describe('Free-text reference number for the purchase order.'),
        ship_via: z.string().optional().describe('Shipping method for the purchase order.'),
        vendor_id: z.string().optional().describe('Unique ID of the vendor for the purchase order.'),
        salesorder_id: z.string().optional().describe('Sales order ID, used when the purchase order is for a drop shipment.'),
        is_drop_shipment: z.boolean().optional().describe('Whether the purchase order is a drop shipment.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether the line item rates are tax-inclusive.'),
        is_backorder: z.boolean().optional().describe('Whether the purchase order is a backorder.'),
        template_id: z.string().optional().describe('Unique ID of the PDF template to use for the purchase order.'),
        attention: z.string().optional().describe('Name of the person whose attention the purchase order is addressed to.'),
        delivery_org_address_id: z.string().optional().describe('ID of the organization delivery address.'),
        delivery_customer_id: z.string().optional().describe('Customer ID associated with the delivery address.'),
        notes: z.string().optional().describe('Notes for the purchase order.'),
        terms: z.string().optional().describe('Terms and conditions for the purchase order.'),
        exchange_rate: z.number().optional().describe('Exchange rate of the transaction currency against the base currency.'),
        location_id: z.string().optional().describe('ID of the location the purchase order is associated with.'),
        gst_treatment: z.string().optional().describe('India only. GST treatment: business_gst, business_none, overseas or consumer.'),
        gst_no: z.string().optional().describe('India only. 15-digit GST identification number of the vendor.'),
        source_of_supply: z.string().optional().describe('India only. Place from where the goods or services are supplied.'),
        destination_of_supply: z.string().optional().describe('India only. Place where the goods or services are supplied to.'),
        ignore_auto_number_generation: z
            .boolean()
            .optional()
            .describe('When true, the supplied purchaseorder_number is used instead of the auto-generated one.'),
        contact_persons_associated: z.array(ContactPersonAssociatedSchema).optional().describe('Contact persons associated with the purchase order.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields to set on the purchase order.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items to set on the purchase order.')
    })
    .describe('Fields to update on an existing Zoho Inventory purchase order. Omitted fields are left unchanged.');

const OutputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique ID of the purchase order.'),
        purchaseorder_number: z.string().describe('Purchase order number.'),
        status: z.string().describe('Fulfilment/receipt rollup status, e.g. draft, issued, partially_received or received.'),
        order_status: z.string().optional().describe('Workflow status of the purchase order, e.g. draft, issued or cancelled.'),
        reference_number: z.string().optional().describe('Reference number of the purchase order.'),
        date: z.string().optional().describe('Purchase order date.'),
        delivery_date: z.string().optional().describe('Delivery date.'),
        expected_delivery_date: z.string().optional().describe('Expected delivery date.'),
        vendor_id: z.string().describe('Unique ID of the vendor.'),
        vendor_name: z.string().describe('Name of the vendor.'),
        currency_id: z.string().optional().describe('Unique ID of the transaction currency.'),
        currency_code: z.string().optional().describe('ISO currency code of the transaction. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol of the transaction.'),
        exchange_rate: z.number().optional().describe('Exchange rate against the base currency.'),
        is_drop_shipment: z.boolean().optional().describe('Whether the purchase order is a drop shipment.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates are tax-inclusive.'),
        is_backorder: z.boolean().optional().describe('Whether the purchase order is a backorder.'),
        notes: z.string().optional().describe('Notes on the purchase order.'),
        terms: z.string().optional().describe('Terms and conditions on the purchase order.'),
        ship_via: z.string().optional().describe('Shipping method for the purchase order.'),
        attention: z.string().optional().describe('Name of the person the purchase order is addressed to.'),
        sub_total: z.number().optional().describe('Sum of line item totals before tax and discount.'),
        tax_total: z.number().optional().describe('Total tax on the purchase order.'),
        discount_total: z.number().optional().describe('Total discount on the purchase order.'),
        total: z.number().optional().describe('Final total of the purchase order.'),
        total_quantity: z.number().optional().describe('Total quantity across all line items.'),
        line_items: z.array(LineItemSchema).describe('Line items on the purchase order.'),
        custom_fields: z.array(CustomFieldSchema).describe('Custom fields set on the purchase order.'),
        created_time: z.string().optional().describe('Creation timestamp. Example: "2026-10-09T14:24:26-0400"'),
        last_modified_time: z.string().optional().describe('Last modification timestamp. Example: "2026-10-09T14:24:28-0400"')
    })
    .describe('The updated Zoho Inventory purchase order.');

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string().nullish()
});

const ProviderResponseSchema = ProviderEnvelopeSchema.extend({
    purchaseorder: OutputSchema.optional(),
    purchase_order: OutputSchema.optional()
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing purchase order's fields and line items through the provider's purchase orders API.
 * @pitfalls: Despite the PUT method, omitted body fields are left unchanged rather than cleared, so send every field you intend to set. Setting ignore_auto_number_generation requires a purchaseorder_number.
 */
const action = createAction({
    description: "Update an existing purchase order's fields or line items.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.purchaseorders.UPDATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.purchaseorder_number !== undefined) data['purchaseorder_number'] = input.purchaseorder_number;
        if (input.date !== undefined) data['date'] = input.date;
        if (input.delivery_date !== undefined) data['delivery_date'] = input.delivery_date;
        if (input.expected_delivery_date !== undefined) data['expected_delivery_date'] = input.expected_delivery_date;
        if (input.reference_number !== undefined) data['reference_number'] = input.reference_number;
        if (input.ship_via !== undefined) data['ship_via'] = input.ship_via;
        if (input.vendor_id !== undefined) data['vendor_id'] = input.vendor_id;
        if (input.salesorder_id !== undefined) data['salesorder_id'] = input.salesorder_id;
        if (input.is_drop_shipment !== undefined) data['is_drop_shipment'] = input.is_drop_shipment;
        if (input.is_inclusive_tax !== undefined) data['is_inclusive_tax'] = input.is_inclusive_tax;
        if (input.is_backorder !== undefined) data['is_backorder'] = input.is_backorder;
        if (input.template_id !== undefined) data['template_id'] = input.template_id;
        if (input.attention !== undefined) data['attention'] = input.attention;
        if (input.delivery_org_address_id !== undefined) data['delivery_org_address_id'] = input.delivery_org_address_id;
        if (input.delivery_customer_id !== undefined) data['delivery_customer_id'] = input.delivery_customer_id;
        if (input.notes !== undefined) data['notes'] = input.notes;
        if (input.terms !== undefined) data['terms'] = input.terms;
        if (input.exchange_rate !== undefined) data['exchange_rate'] = input.exchange_rate;
        if (input.location_id !== undefined) data['location_id'] = input.location_id;
        if (input.gst_treatment !== undefined) data['gst_treatment'] = input.gst_treatment;
        if (input.gst_no !== undefined) data['gst_no'] = input.gst_no;
        if (input.source_of_supply !== undefined) data['source_of_supply'] = input.source_of_supply;
        if (input.destination_of_supply !== undefined) data['destination_of_supply'] = input.destination_of_supply;
        if (input.contact_persons_associated !== undefined) data['contact_persons_associated'] = input.contact_persons_associated;
        if (input.custom_fields !== undefined) data['custom_fields'] = input.custom_fields;
        if (input.line_items !== undefined) data['line_items'] = input.line_items;

        const organizationId = await resolveOrganizationId(nango, input.organization_id);
        const params: Record<string, string> = {
            organization_id: organizationId
        };

        if (input.ignore_auto_number_generation !== undefined) {
            params['ignore_auto_number_generation'] = input.ignore_auto_number_generation ? 'true' : 'false';
        }

        // https://www.zoho.com/inventory/api/v1/purchaseorders/#update-a-purchase-order
        const response = await nango.put<unknown>({
            endpoint: `/inventory/v1/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}`,
            params,
            data,
            retries: 3
        });

        const envelope = ProviderEnvelopeSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when updating a purchase order.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.message ?? 'Zoho Inventory failed to update the purchase order.',
                code: envelope.data.code
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected purchase order payload from Zoho Inventory API.',
                details: parsed.error.message
            });
        }

        const providerOrder = parsed.data.purchaseorder ?? parsed.data.purchase_order;

        if (!providerOrder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The purchase order was not found or the provider returned no purchase order.',
                purchaseorder_id: input.purchaseorder_id
            });
        }

        return providerOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
