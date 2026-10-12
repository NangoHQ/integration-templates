import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique identifier of the purchase order to retrieve. Example: "260815000000127011"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input parameters used to retrieve a single purchase order from Zoho Inventory.');

const BillingAddressSchema = z
    .object({
        address: z.string().optional().describe('Billing street address.'),
        street2: z.string().optional().describe('Second line of the billing street address.'),
        city: z.string().optional().describe('Billing city.'),
        state: z.string().optional().describe('Billing state or province.'),
        zip: z.string().optional().describe('Billing postal or ZIP code.'),
        country: z.string().optional().describe('Billing country.'),
        fax: z.string().optional().describe('Billing fax number.'),
        phone: z.string().optional().describe('Billing phone number.'),
        attention: z.string().optional().describe('Person the purchase order billing is addressed to.')
    })
    .passthrough();

const DeliveryAddressSchema = z
    .object({
        zip: z.string().optional().describe('Delivery postal or ZIP code.'),
        state: z.string().optional().describe('Delivery state or province.'),
        address1: z.string().optional().describe('First line of the delivery address.'),
        address2: z.string().optional().describe('Second line of the delivery address.'),
        address: z.string().optional().describe('Full delivery address.'),
        city: z.string().optional().describe('Delivery city.'),
        country: z.string().optional().describe('Delivery country.'),
        phone: z.string().optional().describe('Delivery contact phone number.'),
        organization_address_id: z.string().optional().describe('ID of the organization address used for delivery.')
    })
    .passthrough();

const ContactPersonSchema = z
    .object({
        contact_person_id: z.string().optional().describe('ID of the associated contact person.'),
        contact_person_name: z.string().optional().describe('Name of the associated contact person.'),
        first_name: z.string().optional().describe('Contact person first name.'),
        last_name: z.string().optional().describe('Contact person last name.'),
        contact_person_email: z.string().optional().describe('Contact person email address.'),
        email: z.string().optional().describe('Contact person email address.'),
        phone: z.string().optional().describe('Contact person phone number.'),
        mobile: z.string().optional().describe('Contact person mobile number.')
    })
    .passthrough();

const TagSchema = z
    .object({
        tag_id: z.string().optional().describe('ID of the tag.'),
        tag_name: z.string().optional().describe('Name of the tag.'),
        tag_option_id: z.string().optional().describe('ID of the selected tag option.'),
        tag_option_name: z.string().optional().describe('Name of the selected tag option.'),
        is_tag_mandatory: z.boolean().optional().describe('Whether the tag is mandatory.')
    })
    .passthrough();

const CustomFieldSchema = z
    .object({
        customfield_id: z.string().optional().describe('ID of the custom field.'),
        value: z.string().optional().describe('Value of the custom field.')
    })
    .passthrough();

const DocumentSchema = z
    .object({
        document_id: z.string().optional().describe('ID of the attached document.'),
        file_name: z.string().optional().describe('File name of the attached document.')
    })
    .passthrough();

const LineItemSchema = z
    .object({
        item_id: z.string().optional().describe('ID of the item ordered.'),
        line_item_id: z.string().optional().describe('ID of this line item on the purchase order.'),
        sku: z.string().optional().describe('SKU of the item.'),
        account_id: z.string().optional().describe('ID of the expense account associated with the line item.'),
        account_name: z.string().optional().describe('Name of the expense account associated with the line item.'),
        name: z.string().optional().describe('Name of the item or service.'),
        description: z.string().optional().describe('Description of the line item.'),
        item_order: z.number().optional().describe('Position of the line item in the purchase order.'),
        rate: z.number().optional().describe('Unit rate of the item.'),
        bcy_rate: z.number().optional().describe('Unit rate of the item in the base currency.'),
        quantity: z.number().optional().describe('Quantity ordered.'),
        unit: z.string().optional().describe('Unit of measurement for the quantity.'),
        item_total: z.number().optional().describe('Total amount for the line item before taxes.'),
        discount: z.number().optional().describe('Discount applied to the line item.'),
        quantity_received: z.number().optional().describe('Quantity already received against this line item.'),
        quantity_billed: z.number().optional().describe('Quantity already billed against this line item.'),
        tax_id: z.string().optional().describe('ID of the tax applied to the line item.'),
        tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
        tax_type: z.string().optional().describe('Type of tax applied to the line item.'),
        tax_percentage: z.number().optional().describe('Tax percentage applied to the line item.'),
        location_id: z.string().optional().describe('ID of the location the item is received into.'),
        location_name: z.string().optional().describe('Name of the location the item is received into.'),
        tags: z.array(TagSchema).optional().describe('Tags associated with the line item.'),
        item_custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields of the line item.')
    })
    .passthrough();

const LockDetailSchema = z
    .object({
        can_lock: z.boolean().optional().describe('Whether the purchase order can be locked.'),
        custom_locks: z.array(z.unknown()).optional().describe('Custom lock entries applied to the purchase order.'),
        system_locks: z.array(z.unknown()).optional().describe('System lock entries applied to the purchase order.')
    })
    .passthrough();

const PurchaseOrderSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique identifier of the purchase order.'),
        purchaseorder_number: z.string().optional().describe('Human-readable purchase order number. Example: "PO-00001"'),
        date: z.string().optional().describe('Purchase order date in yyyy-MM-dd format.'),
        delivery_date: z.string().optional().describe('Requested delivery date for the purchase order.'),
        expected_delivery_date: z.string().optional().describe('Expected delivery date recorded on the purchase order.'),
        reference_number: z.string().optional().describe('External reference number for the purchase order.'),
        status: z.string().optional().describe('Fulfillment/receipt rollup status (e.g. "draft", "received"), which can disagree with order_status.'),
        order_status: z.string().optional().describe('Workflow status of the purchase order (e.g. "draft", "issued").'),
        received_status: z.string().optional().describe('Receipt status of the purchase order.'),
        billed_status: z.string().optional().describe('Billing status of the purchase order.'),
        current_sub_status: z.string().optional().describe('Current workflow sub-status label.'),
        current_sub_status_id: z.string().optional().describe('ID of the current workflow sub-status.'),
        is_received: z.boolean().optional().describe('Whether the purchase order lines have been fully received.'),
        is_po_marked_as_received: z.boolean().optional().describe('Whether the purchase order is explicitly marked as received.'),
        is_backorder: z.boolean().optional().describe('Whether the purchase order is a backorder.'),
        is_drop_shipment: z.boolean().optional().describe('Whether the purchase order is a drop shipment.'),
        is_emailed: z.boolean().optional().describe('Whether the purchase order has been emailed to the vendor.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates include tax.'),
        vendor_id: z.string().optional().describe('ID of the vendor.'),
        vendor_name: z.string().optional().describe('Name of the vendor.'),
        contact_persons: z.array(ContactPersonSchema).optional().describe('Contact persons of the vendor.'),
        contact_persons_associated: z.array(ContactPersonSchema).optional().describe('Contact persons associated with the purchase order.'),
        currency_id: z.string().optional().describe('ID of the currency.'),
        currency_code: z.string().optional().describe('Currency code. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol. Example: "$"'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the purchase order.'),
        total_quantity: z.number().optional().describe('Total quantity ordered across all line items.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items in the purchase order.'),
        sub_total: z.number().optional().describe('Subtotal before taxes and discounts.'),
        tax_total: z.number().optional().describe('Total tax amount.'),
        discount: z.number().optional().describe('Total discount amount.'),
        discount_amount: z.number().optional().describe('Total discount amount applied to the purchase order.'),
        total: z.number().optional().describe('Total amount of the purchase order.'),
        taxes: z.array(z.unknown()).optional().describe('Tax breakdown for the purchase order.'),
        billing_address: BillingAddressSchema.optional().describe('Vendor billing address.'),
        delivery_address: DeliveryAddressSchema.optional().describe('Delivery address for the purchase order.'),
        notes: z.string().optional().describe('Notes shown on the purchase order.'),
        terms: z.string().optional().describe('Terms and conditions shown on the purchase order.'),
        ship_via: z.string().optional().describe('Shipping method requested on the purchase order.'),
        ship_via_id: z.string().optional().describe('ID of the shipping method.'),
        attention: z.string().optional().describe('Person the purchase order is addressed to.'),
        price_precision: z.union([z.number(), z.string()]).optional().describe('Decimal precision used for prices.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields of the purchase order.'),
        attachment_name: z.string().optional().describe('Name of the file attached to the purchase order.'),
        documents: z.array(DocumentSchema).optional().describe('Documents attached to the purchase order.'),
        template_id: z.string().optional().describe('ID of the PDF template used for the purchase order.'),
        template_name: z.string().optional().describe('Name of the PDF template used for the purchase order.'),
        created_time: z.string().optional().describe('Time at which the purchase order was created.'),
        created_by_id: z.string().optional().describe('ID of the user who created the purchase order.'),
        last_modified_time: z.string().optional().describe('Time at which the purchase order was last modified.'),
        can_mark_as_bill: z.boolean().optional().describe('Whether the purchase order can still be converted into a bill.'),
        can_mark_as_unbill: z.boolean().optional().describe('Whether the bill conversion can be reverted.'),
        tags: z.array(TagSchema).optional().describe('Tags associated with the purchase order.'),
        lock_detail: LockDetailSchema.optional().describe('Lock information for the purchase order.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        code: z.number().describe('Zoho response code; 0 indicates success.'),
        message: z.string().describe('Zoho response message, e.g. "success".'),
        purchaseorder: PurchaseOrderSchema.optional().describe('Full details of the requested purchase order.')
    })
    .describe('A single purchase order returned by Zoho Inventory for the requested ID.');

/**
 * @tags: [read]
 * @tagReason: Reads a single purchase order from Zoho Inventory and performs no provider mutations.
 * @pitfalls: The returned status field is a separate fulfillment/receipt rollup that can disagree with order_status, so do not use status alone to tell whether a purchase order has been issued.
 */
const action = createAction({
    description: 'Retrieve a single purchase order from Zoho Inventory by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.purchaseorders.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/purchaseorders/#get-a-purchase-order
            endpoint: `/inventory/v1/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider response could not be parsed.',
                details: parsed.error.issues
            });
        }

        if (parsed.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.data.message,
                code: parsed.data.code
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
