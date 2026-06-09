import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    organization_id: z.string().describe('Zoho Books organization ID. Example: "927270289"')
});

const InputSchema = z.object({
    payment_id: z.string().describe('Vendor payment ID. Example: "260815000000116002"')
});

const CheckDetailsSchema = z
    .object({
        amount_in_words: z.string().optional(),
        check_id: z.string().optional(),
        check_number: z.string().optional(),
        check_status: z.string().optional(),
        memo: z.string().optional(),
        template_id: z.string().optional(),
        retain_txn_in_void_check: z.boolean().optional()
    })
    .passthrough();

const BillSchema = z
    .object({
        bill_payment_id: z.string().optional(),
        bill_id: z.string().optional(),
        amount_applied: z.number().optional(),
        tax_amount_withheld: z.number().optional(),
        balance: z.number().optional(),
        bill_number: z.string().optional(),
        date: z.string().optional(),
        due_date: z.string().optional(),
        price_precision: z.number().optional(),
        total: z.number().optional(),
        is_opening_balance: z.boolean().optional(),
        unprocessed_payment_amount: z.number().optional(),
        apply_date: z.string().optional()
    })
    .passthrough();

const VendorPaymentRefundSchema = z
    .object({
        vendorpayment_refund_id: z.string().optional(),
        date: z.string().optional(),
        refund_mode: z.string().optional(),
        reference_number: z.string().optional(),
        description: z.string().optional(),
        amount_bcy: z.number().optional(),
        amount_fcy: z.number().optional()
    })
    .passthrough();

const CustomFieldSchema = z
    .object({
        custom_field_id: z.string().optional(),
        index: z.number().optional(),
        label: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const TagSchema = z
    .object({
        tag_id: z.string().optional(),
        tag_name: z.string().optional(),
        tag_option_id: z.string().optional(),
        tag_option_name: z.string().optional(),
        is_tag_mandatory: z.boolean().optional()
    })
    .passthrough();

const CommentSchema = z
    .object({
        comment_id: z.string().optional(),
        description: z.string().optional(),
        commented_by_id: z.string().optional(),
        commented_by: z.string().optional(),
        date: z.string().optional(),
        date_description: z.string().optional(),
        time: z.string().optional(),
        operation_type: z.string().optional()
    })
    .passthrough();

const AddressSchema = z
    .object({
        address: z.string().optional(),
        street2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
        fax: z.string().optional(),
        phone: z.string().optional(),
        attention: z.string().optional()
    })
    .passthrough();

const ProviderVendorPaymentSchema = z
    .object({
        payment_id: z.string().optional(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        status: z.string().optional(),
        is_online_payment: z.boolean().optional(),
        transfer_type: z.string().optional(),
        payment_mode: z.string().optional(),
        payment_number: z.union([z.string(), z.number()]).optional(),
        payment_number_prefix: z.string().optional(),
        payment_number_suffix: z.string().optional(),
        purpose_code: z.string().optional(),
        description: z.string().optional(),
        date: z.string().optional(),
        reference_number: z.string().optional(),
        exchange_rate: z.number().optional(),
        tax_account_id: z.string().optional(),
        tax_account_name: z.string().optional(),
        tax_amount_withheld: z.number().optional(),
        amount: z.number().optional(),
        bank_charges: z.number().optional(),
        bank_charges_account_id: z.string().optional(),
        bank_charges_account_name: z.string().optional(),
        balance: z.number().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        currency_symbol: z.string().optional(),
        created_time: z.string().optional(),
        created_by_id: z.string().optional(),
        created_by_name: z.string().optional(),
        last_modified_time: z.string().optional(),
        credit_account_id: z.string().optional(),
        paid_through_account_id: z.string().optional(),
        paid_through_account_name: z.string().optional(),
        paid_through_account_type: z.string().optional(),
        offset_account_id: z.string().optional(),
        offset_account_name: z.string().optional(),
        is_paid_via_print_check: z.boolean().optional(),
        is_ach_payment: z.boolean().optional(),
        ach_payment_status: z.string().optional(),
        gw_reference_number: z.string().optional(),
        check_details: CheckDetailsSchema.optional(),
        billing_address: AddressSchema.optional(),
        comments: z.union([z.string(), z.array(CommentSchema)]).optional(),
        vendorpayment_refunds: z.array(VendorPaymentRefundSchema).optional(),
        bills: z.array(BillSchema).optional(),
        custom_fields: z.array(CustomFieldSchema).optional(),
        custom_field_hash: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(TagSchema).optional(),
        imported_transactions: z.array(z.string()).optional(),
        documents: z.array(z.string()).optional(),
        approvers_list: z.array(z.unknown()).optional(),
        location_id: z.string().optional(),
        location_name: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderVendorPaymentSchema;

const action = createAction({
    description: 'Retrieve a single vendor payment from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-vendor-payment',
        group: 'Vendor Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.vendorpayments.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const validatedMetadata = MetadataSchema.safeParse(metadata);

        if (!validatedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing or invalid metadata. organization_id is required.'
            });
        }

        const organizationId = validatedMetadata.data.organization_id;

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/vendor-payments/#get-a-vendor-payment
            endpoint: `/books/v3/vendorpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vendor payment not found or invalid response from provider',
                payment_id: input.payment_id
            });
        }

        const responseData = response.data;
        const vendorpayment = 'vendorpayment' in responseData ? responseData.vendorpayment : undefined;

        if (vendorpayment === undefined || vendorpayment === null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vendor payment not found',
                payment_id: input.payment_id
            });
        }

        const providerVendorPayment = ProviderVendorPaymentSchema.parse(vendorpayment);

        return providerVendorPayment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
