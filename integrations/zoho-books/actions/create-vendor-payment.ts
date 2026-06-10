import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const BillPaymentInputSchema = z.object({
    bill_id: z.string().describe('ID of the bill to apply the payment to. Example: "260815000000108002"'),
    amount_applied: z.number().describe('Amount applied to the bill. Example: 100.00')
});

const InputSchema = z.object({
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    vendor_id: z.string().describe('ID of the vendor associated with the payment. Example: "260815000000098001"'),
    amount: z.number().describe('Total amount of the vendor payment. Example: 100.00'),
    paid_through_account_id: z.string().describe('ID of the cash/bank account used for the payment. Example: "260815000000102017"'),
    date: z.string().optional().describe('Date the payment is made (YYYY-MM-DD). Example: "2026-06-09"'),
    payment_mode: z.string().optional().describe('Mode of payment. Example: "cash"'),
    description: z.string().optional().describe('Description for the vendor payment.'),
    reference_number: z.string().optional().describe('Reference number for the vendor payment. Example: "VP-003"'),
    bills: z.array(BillPaymentInputSchema).optional().describe('Bills to apply the payment to.')
});

const ProviderPaymentSchema = z
    .object({
        vendorpayment_id: z.string().optional(),
        payment_id: z.string().optional(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        amount: z.number().optional(),
        date: z.string().optional(),
        payment_mode: z.string().optional(),
        reference_number: z.string().optional(),
        description: z.string().optional(),
        paid_through_account_id: z.string().optional(),
        paid_through_account_name: z.string().optional(),
        bills: z
            .array(
                z
                    .object({
                        bill_id: z.string().optional(),
                        bill_number: z.string().optional(),
                        amount_applied: z.number().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        code: z.number().optional(),
        message: z.string().optional(),
        vendorpayment: ProviderPaymentSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().describe('ID of the created vendor payment.'),
    vendor_id: z.string().optional().describe('ID of the vendor.'),
    vendor_name: z.string().optional().describe('Name of the vendor.'),
    amount: z.number().optional().describe('Total amount of the payment.'),
    date: z.string().optional().describe('Date of the payment.'),
    payment_mode: z.string().optional().describe('Payment mode.'),
    reference_number: z.string().optional().describe('Reference number.'),
    description: z.string().optional().describe('Description.'),
    paid_through_account_id: z.string().optional().describe('ID of the account used for payment.'),
    paid_through_account_name: z.string().optional().describe('Name of the account used for payment.'),
    bills: z
        .array(
            z.object({
                bill_id: z.string().optional(),
                bill_number: z.string().optional(),
                amount_applied: z.number().optional()
            })
        )
        .optional()
        .describe('Bills the payment was applied to.')
});

const action = createAction({
    description: 'Create a vendor payment in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-vendor-payment',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.vendorpayments.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
        }

        const requestBody: {
            vendor_id: string;
            amount: number;
            paid_through_account_id: string;
            date?: string;
            payment_mode?: string;
            description?: string;
            reference_number?: string;
            bills?: Array<{ bill_id: string; amount_applied: number }>;
        } = {
            vendor_id: input.vendor_id,
            amount: input.amount,
            paid_through_account_id: input.paid_through_account_id
        };

        if (input.date !== undefined) {
            requestBody.date = input.date;
        }
        if (input.payment_mode !== undefined) {
            requestBody.payment_mode = input.payment_mode;
        }
        if (input.description !== undefined) {
            requestBody.description = input.description;
        }
        if (input.reference_number !== undefined) {
            requestBody.reference_number = input.reference_number;
        }
        if (input.bills !== undefined) {
            requestBody.bills = input.bills;
        }

        // https://www.zoho.com/books/api/v3/vendor-payments/#create-a-vendor-payment
        const response = await nango.post({
            endpoint: '/books/v3/vendorpayments',
            params: {
                organization_id: organizationId
            },
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const code = parsed.code ?? null;
        const message = parsed.message;
        const payment = parsed.vendorpayment;

        if (code !== null && code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: message || 'Failed to create vendor payment.',
                code: code
            });
        }

        if (!payment) {
            throw new nango.ActionError({
                type: 'missing_response',
                message: 'Vendor payment data missing from provider response.'
            });
        }

        const paymentId = payment.vendorpayment_id ?? payment.payment_id;

        if (!paymentId) {
            throw new nango.ActionError({
                type: 'missing_id',
                message: 'Vendor payment ID missing from provider response.'
            });
        }

        const vendorId = payment.vendor_id;
        const vendorName = payment.vendor_name;
        const amount = payment.amount;
        const date = payment.date;
        const paymentMode = payment.payment_mode;
        const referenceNumber = payment.reference_number;
        const description = payment.description;
        const paidThroughAccountId = payment.paid_through_account_id;
        const paidThroughAccountName = payment.paid_through_account_name;

        const bills = payment.bills
            ? payment.bills
                  .filter((b) => typeof b === 'object' && b !== null && !Array.isArray(b))
                  .map((b) => {
                      const parsedBill = z
                          .object({
                              bill_id: z.string().optional(),
                              bill_number: z.string().optional(),
                              amount_applied: z.number().optional()
                          })
                          .passthrough()
                          .parse(b);
                      return {
                          ...(parsedBill.bill_id !== undefined && { bill_id: parsedBill.bill_id }),
                          ...(parsedBill.bill_number !== undefined && { bill_number: parsedBill.bill_number }),
                          ...(parsedBill.amount_applied !== undefined && { amount_applied: parsedBill.amount_applied })
                      };
                  })
            : undefined;

        return {
            id: paymentId,
            ...(vendorId !== undefined && { vendor_id: vendorId }),
            ...(vendorName !== undefined && { vendor_name: vendorName }),
            ...(amount !== undefined && { amount: amount }),
            ...(date !== undefined && { date: date }),
            ...(paymentMode !== undefined && { payment_mode: paymentMode }),
            ...(referenceNumber !== undefined && { reference_number: referenceNumber }),
            ...(description !== undefined && { description: description }),
            ...(paidThroughAccountId !== undefined && { paid_through_account_id: paidThroughAccountId }),
            ...(paidThroughAccountName !== undefined && { paid_through_account_name: paidThroughAccountName }),
            ...(bills !== undefined && { bills: bills })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
