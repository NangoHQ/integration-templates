import { z } from 'zod';
import { createAction } from 'nango';

const BillPaymentInputSchema = z.object({
    bill_payment_id: z.string().optional().describe('ID of the Bill Payment'),
    bill_id: z.string().optional().describe('ID of the bill the payment is to be applied'),
    amount_applied: z.number().optional().describe('Amount applied to the bill'),
    tax_amount_withheld: z.number().optional().describe('Tax Amount Withheld during Bill Payment')
});

const TagInputSchema = z.object({
    tag_id: z.string().optional().describe("Tag's ID"),
    tag_option_id: z.string().optional().describe("Tag Option's ID")
});

const CustomFieldInputSchema = z.object({
    index: z.number().optional().describe('Index of the Custom Field'),
    value: z.string().optional().describe('Value for the Custom Field')
});

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    payment_id: z.string().describe('ID of the vendor payment to update. Example: "260815000000116002"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    vendor_id: z.string().optional().describe('ID of the vendor associated with the Vendor Payment'),
    amount: z.number().optional().describe('Total Amount of Vendor Payment'),
    date: z.string().optional().describe('Date the payment is made. Format: yyyy-mm-dd'),
    exchange_rate: z.number().optional().describe('Exchange rate of the currency'),
    paid_through_account_id: z.string().optional().describe('ID of the cash/bank account from which the payment is made'),
    payment_mode: z.string().optional().describe('Mode of Vendor Payment'),
    description: z.string().optional().describe('Description for the Vendor Payment recorded'),
    reference_number: z.string().optional().describe('Reference number for the Vendor Payment recorded'),
    is_paid_via_print_check: z.boolean().optional().describe('Check if the Bill Payment is paid Via Print Check Option'),
    location_id: z.string().optional().describe('Location ID'),
    bills: z.array(BillPaymentInputSchema).optional().describe('Individual bill payment details as array'),
    tags: z.array(TagInputSchema).optional().describe('Reporting tags'),
    custom_fields: z.array(CustomFieldInputSchema).optional().describe('Custom fields associated with the vendor payment')
});

const BillPaymentOutputSchema = z.object({
    bill_payment_id: z.string().optional(),
    bill_id: z.string().optional(),
    amount_applied: z.number().optional(),
    tax_amount_withheld: z.number().optional()
});

const TagOutputSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const CustomFieldOutputSchema = z.object({
    custom_field_id: z.string().optional(),
    index: z.number().optional(),
    label: z.string().optional(),
    value: z.string().optional()
});

const VendorPaymentOutputSchema = z.object({
    payment_id: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    payment_mode: z.string().optional(),
    payment_number: z.union([z.string(), z.number()]).optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    reference_number: z.string().optional(),
    exchange_rate: z.number().optional(),
    tax_amount_withheld: z.number().optional(),
    amount: z.number().optional(),
    balance: z.number().optional(),
    currency_id: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    paid_through_account_id: z.string().optional(),
    paid_through_account_name: z.string().optional(),
    paid_through_account_type: z.string().optional(),
    is_paid_via_print_check: z.boolean().optional(),
    is_ach_payment: z.boolean().optional(),
    ach_payment_status: z.string().optional(),
    bills: z.array(BillPaymentOutputSchema).optional(),
    tags: z.array(TagOutputSchema).optional(),
    custom_fields: z.array(CustomFieldOutputSchema).optional()
});

const OutputSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    vendorpayment: VendorPaymentOutputSchema.optional()
});

const action = createAction({
    description: 'Update a vendor payment in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-vendor-payment',
        group: 'Vendor Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.vendorpayments.UPDATE', 'ZohoBooks.settings.READ'],

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

        const payload: Record<string, unknown> = {};
        if (input.vendor_id !== undefined) {
            payload['vendor_id'] = input.vendor_id;
        }
        if (input.amount !== undefined) {
            payload['amount'] = input.amount;
        }
        if (input.date !== undefined) {
            payload['date'] = input.date;
        }
        if (input.exchange_rate !== undefined) {
            payload['exchange_rate'] = input.exchange_rate;
        }
        if (input.paid_through_account_id !== undefined) {
            payload['paid_through_account_id'] = input.paid_through_account_id;
        }
        if (input.payment_mode !== undefined) {
            payload['payment_mode'] = input.payment_mode;
        }
        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.reference_number !== undefined) {
            payload['reference_number'] = input.reference_number;
        }
        if (input.is_paid_via_print_check !== undefined) {
            payload['is_paid_via_print_check'] = input.is_paid_via_print_check;
        }
        if (input.location_id !== undefined) {
            payload['location_id'] = input.location_id;
        }
        if (input.bills !== undefined) {
            payload['bills'] = input.bills;
        }
        if (input.tags !== undefined) {
            payload['tags'] = input.tags;
        }
        if (input.custom_fields !== undefined) {
            payload['custom_fields'] = input.custom_fields;
        }

        const response = await nango.put({
            // https://www.zoho.com/books/api/v3/vendor-payments/#update_a_vendor_payment
            endpoint: `/books/v3/vendorpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: organizationId
            },
            data: payload,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Zoho Books API',
                data: response.data
            });
        }

        const data = response.data;
        const entries = Object.entries(data);
        const map = new Map(entries);

        const code = map.get('code');
        const message = map.get('message');
        const vendorpaymentRaw = map.get('vendorpayment');

        if (code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: typeof message === 'string' ? message : 'Zoho Books API returned an error',
                code: code
            });
        }

        let vendorPaymentData: unknown = vendorpaymentRaw;
        if (Array.isArray(vendorPaymentData)) {
            vendorPaymentData = vendorPaymentData[0];
        }

        let vendorpayment: z.infer<typeof VendorPaymentOutputSchema> | undefined;
        if (vendorPaymentData != null && typeof vendorPaymentData === 'object') {
            const parsed = VendorPaymentOutputSchema.safeParse(vendorPaymentData);
            if (parsed.success) {
                vendorpayment = parsed.data;
            }
        }

        return {
            code: typeof code === 'number' ? code : undefined,
            message: typeof message === 'string' ? message : undefined,
            ...(vendorpayment !== undefined && { vendorpayment })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
