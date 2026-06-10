import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemSchema = z.object({
    purchaseorder_item_id: z.string().optional(),
    line_item_id: z.string().optional(),
    item_id: z.string().optional(),
    name: z.string().optional(),
    account_id: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    hsn_or_sac: z.string().optional(),
    reverse_charge_tax_id: z.string().optional(),
    location_id: z.string().optional(),
    quantity: z.number().optional(),
    tax_id: z.string().optional(),
    tds_tax_id: z.string().optional(),
    tax_treatment_code: z.string().optional(),
    tax_exemption_id: z.string().optional(),
    tax_exemption_code: z.string().optional(),
    item_order: z.number().optional(),
    product_type: z.string().optional(),
    acquisition_vat_id: z.string().optional(),
    reverse_charge_vat_id: z.string().optional(),
    unit: z.string().optional(),
    tags: z
        .array(
            z.object({
                tag_id: z.string().optional(),
                tag_option_id: z.string().optional()
            })
        )
        .optional(),
    is_billable: z.boolean().optional(),
    project_id: z.string().optional(),
    customer_id: z.string().optional(),
    item_custom_fields: z
        .array(
            z.object({
                custom_field_id: z.string().optional(),
                index: z.number().optional(),
                value: z.string().optional(),
                label: z.string().optional()
            })
        )
        .optional(),
    serial_numbers: z.array(z.string()).optional()
});

const TaxSchema = z.object({
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_amount: z.number().optional()
});

const DocumentSchema = z.object({
    document_id: z.string().optional(),
    file_name: z.string().optional()
});

const CustomFieldSchema = z.object({
    index: z.number().optional(),
    value: z.string().optional()
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_option_id: z.string().optional()
});

const ApproverSchema = z.object({
    approver_id: z.string().optional(),
    order: z.number().optional()
});

const UpdateBillInputSchema = z.object({
    bill_id: z.string().min(1),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    vendor_id: z.string().optional(),
    currency_id: z.string().optional(),
    vat_treatment: z.string().optional(),
    is_update_customer: z.boolean().optional(),
    purchaseorder_ids: z.array(z.string()).optional(),
    bill_number: z.string().optional(),
    documents: z.array(DocumentSchema).optional(),
    source_of_supply: z.string().optional(),
    destination_of_supply: z.string().optional(),
    place_of_supply: z.string().optional(),
    permit_number: z.string().optional(),
    gst_treatment: z.string().optional(),
    tax_treatment: z.string().optional(),
    gst_no: z.string().optional(),
    pricebook_id: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    payment_terms: z.number().optional(),
    payment_terms_label: z.string().optional(),
    recurring_bill_id: z.string().optional(),
    exchange_rate: z.number().optional(),
    is_item_level_tax_calc: z.boolean().optional(),
    is_inclusive_tax: z.boolean().optional(),
    adjustment: z.number().optional(),
    adjustment_description: z.string().optional(),
    location_id: z.string().optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    tags: z.array(TagSchema).optional(),
    line_items: z.array(LineItemSchema).optional(),
    taxes: z.array(TaxSchema).optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    approvers: z.array(ApproverSchema).optional()
});

const UpdateBillOutputSchema = z
    .object({
        code: z.number(),
        message: z.string(),
        bill: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

export default createAction({
    description: 'Update a bill in Zoho Books.',
    endpoint: {
        method: 'POST',
        path: '/actions/update-bill'
    },
    input: UpdateBillInputSchema,
    output: UpdateBillOutputSchema,
    scopes: ['ZohoBooks.bills.UPDATE', 'ZohoBooks.settings.READ'],
    exec: async (nango, input) => {
        const { bill_id, organization_id: inputOrgId, ...body } = input;

        let organizationId = inputOrgId;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0 || !orgData.organizations || orgData.organizations.length === 0) {
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

        // https://www.zoho.com/books/api/v3/bills/#update-a-bill
        const response = await nango.put({
            endpoint: `/books/v3/bills/${encodeURIComponent(bill_id)}`,
            params: {
                organization_id: organizationId
            },
            data: body,
            retries: 3
        });

        const parsed = UpdateBillOutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Failed to parse update bill response',
                error: parsed.error.message
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
