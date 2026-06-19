import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    purchaseorder_id: z.string().describe('Unique identifier of the purchase order. Example: "460000000062001"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const AddressSchema = z.object({
    address: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    fax: z.string().optional(),
    attention: z.string().optional()
});

const DeliveryAddressSchema = z.object({
    zip: z.string().optional(),
    is_verifiable: z.boolean().optional(),
    state: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    is_valid: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
    is_primary: z.string().optional(),
    organization_address_id: z.string().optional(),
    phone: z.string().optional(),
    is_verified: z.boolean().optional()
});

const ContactPersonSchema = z.object({
    contact_person_id: z.number().optional(),
    contact_person_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    contact_person_email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    communication_preference: z
        .object({
            is_email_enabled: z.boolean().optional(),
            is_whatsapp_enabled: z.boolean().optional()
        })
        .optional()
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const CustomFieldSchema = z.object({
    customfield_id: z.string().optional(),
    value: z.string().optional()
});

const LineItemSchema = z.object({
    item_id: z.string().optional(),
    line_item_id: z.string().optional(),
    sku: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    product_type: z.string().optional(),
    reverse_charge_tax_id: z.number().optional(),
    reverse_charge_tax_name: z.string().optional(),
    reverse_charge_tax_percentage: z.number().optional(),
    reverse_charge_tax_amount: z.number().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    item_order: z.number().optional(),
    bcy_rate: z.number().optional(),
    unit: z.string().optional(),
    rate: z.number().optional(),
    quantity: z.number().optional(),
    item_total: z.number().optional(),
    item_total_inclusive_of_tax: z.number().optional(),
    tax_exemption_id: z.string().optional(),
    tax_exemption_code: z.string().optional(),
    tax_id: z.string().optional(),
    tax_treatment_code: z.string().optional(),
    tax_name: z.string().optional(),
    tax_type: z.string().optional(),
    tax_percentage: z.number().optional(),
    hsn_or_sac: z.string().optional(),
    acquisition_vat_id: z.string().optional(),
    acquisition_vat_name: z.string().optional(),
    acquisition_vat_percentage: z.string().optional(),
    acquisition_vat_amount: z.string().optional(),
    reverse_charge_vat_id: z.string().optional(),
    reverse_charge_vat_name: z.string().optional(),
    reverse_charge_vat_percentage: z.string().optional(),
    reverse_charge_vat_amount: z.string().optional(),
    tags: z.array(TagSchema).optional(),
    item_custom_fields: z.array(CustomFieldSchema).optional(),
    project_id: z.union([z.string(), z.number()]).optional(),
    project_name: z.string().optional()
});

const TaxSummarySchema = z.object({
    tax_name: z.string().optional(),
    tax_amount: z.number().optional()
});

const DocumentSchema = z.object({
    document_id: z.string().optional(),
    file_name: z.string().optional()
});

const PurchaseOrderSchema = z.object({
    purchaseorder_id: z.string().optional(),
    documents: z.array(DocumentSchema).optional(),
    vat_treatment: z.string().optional(),
    gst_no: z.string().optional(),
    gst_treatment: z.string().optional(),
    tax_treatment: z.string().optional(),
    is_pre_gst: z.boolean().optional(),
    source_of_supply: z.string().optional(),
    destination_of_supply: z.string().optional(),
    place_of_supply: z.string().optional(),
    pricebook_id: z.number().optional(),
    pricebook_name: z.string().optional(),
    is_reverse_charge_applied: z.boolean().optional(),
    purchaseorder_number: z.string().optional(),
    date: z.string().optional(),
    expected_delivery_date: z.string().optional(),
    discount: z.union([z.string(), z.number()]).optional(),
    discount_account_id: z.string().optional(),
    is_discount_before_tax: z.boolean().optional(),
    reference_number: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    crm_owner_id: z.string().optional(),
    contact_persons_associated: z.array(ContactPersonSchema).optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    exchange_rate: z.number().optional(),
    delivery_date: z.string().optional(),
    is_emailed: z.boolean().optional(),
    is_inclusive_tax: z.boolean().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    line_items: z.array(LineItemSchema).optional(),
    sub_total: z.number().optional(),
    tax_total: z.number().optional(),
    total: z.number().optional(),
    taxes: z.array(z.string()).optional(),
    acquisition_vat_summary: z.array(TaxSummarySchema).optional(),
    acquisition_vat_total: z.number().optional(),
    reverse_charge_vat_summary: z.array(TaxSummarySchema).optional(),
    reverse_charge_vat_total: z.number().optional(),
    billing_address: AddressSchema.optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    ship_via: z.string().optional(),
    ship_via_id: z.string().optional(),
    attention: z.string().optional(),
    delivery_org_address_id: z.string().optional(),
    delivery_customer_id: z.string().optional(),
    delivery_address: DeliveryAddressSchema.optional(),
    price_precision: z.union([z.string(), z.number()]).optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    attachment_name: z.string().optional(),
    can_send_in_mail: z.boolean().optional(),
    template_id: z.string().optional(),
    template_name: z.string().optional(),
    page_width: z.string().optional(),
    page_height: z.string().optional(),
    orientation: z.string().optional(),
    template_type: z.string().optional(),
    created_time: z.string().optional(),
    created_by_id: z.string().optional(),
    last_modified_time: z.string().optional(),
    can_mark_as_bill: z.boolean().optional(),
    can_mark_as_unbill: z.boolean().optional(),
    tags: z.array(TagSchema).optional()
});

const OutputSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    purchaseorder: PurchaseOrderSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single purchase order from Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.purchaseorders.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/purchase-order/#get-a-purchase-order
            endpoint: `/books/v3/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}`,
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

        if (parsed.data.code !== undefined && parsed.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.data.message ?? 'Failed to retrieve purchase order',
                code: parsed.data.code
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
