import { createAction } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { parseDate } from '../utils.js';

import type { ProxyConfiguration } from "nango";

import {
    PaymentActionResponse,
    CreatePayment,
    FailedPayment,
    Payment,
    Anonymous_xero_action_createpayment_input,
    ActionErrorResponse,
} from "../models.js";

const action = createAction({
    description: "Creates one or more payments in Xero.\nNote: Does NOT check if the payment already exists.",
    version: "1.0.3",

    endpoint: {
        method: "POST",
        path: "/payments",
        group: "Payments"
    },

    input: Anonymous_xero_action_createpayment_input,
    output: PaymentActionResponse,
    scopes: ["accounting.transactions"],

    exec: async (nango, input): Promise<PaymentActionResponse> => {
        const tenant_id = await getTenantId(nango);

        // Validate the credit notes:

        // Check if invoice_id or credit_note_id is present
        let invalidPayments = input.filter((x: any) => (!x.invoice_id && !x.credit_note_id) || (x.invoice_id && x.credit_note_id));
        if (invalidPayments.length > 0) {
            throw new nango.ActionError<ActionErrorResponse>({
                message: `Payment needs to have exactly one of either invoice_id or credit_note_id set. You either specified none or both.\nInvalid payments:\n${JSON.stringify(
                    invalidPayments,
                    null,
                    4
                )}`
            });
        }

        // Check for required fields
        invalidPayments = input.filter((x: any) => (!x.account_code && !x.account_id) || !x.date || !x.amount_cents);
        if (invalidPayments.length > 0) {
            throw new nango.ActionError<ActionErrorResponse>({
                message: `Some payments are missing required fields.\nInvalid payments:\n${JSON.stringify(invalidPayments, null, 4)}`
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/payments/#put-payments
            endpoint: 'api.xro/2.0/Payments',
            headers: {
                'xero-tenant-id': tenant_id
            },
            params: {
                summarizeErrors: 'false'
            },
            data: {
                Payments: input.map(mapPaymentToXero)
            },
            retries: 3
        };

        const res = await nango.put(config);
        const payments = res.data.Payments;

        const failedPayments = payments.filter((x: any) => x.HasValidationErrors);
        if (failedPayments.length > 0) {
            await nango.log(
                `Some payments could not be created in Xero due to validation errors. Note that the remaining payments (${
                    input.length - failedPayments.length
                }) were created successfully. Affected payments:\n${JSON.stringify(failedPayments, null, 4)}`,
                { level: 'error' }
            );
        }
        const succeededPayments = payments.filter((x: any) => !x.HasValidationErrors);

        return {
            succeededPayment: succeededPayments.map(mapXeroPayment),
            failedPayments: failedPayments.map(mapFailedXeroPayment)
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function mapPaymentToXero(payment: CreatePayment) {
    const xeroPayment: Record<string, any> = {
        Amount: payment.amount_cents / 100
    };

    if (payment.account_code) {
        xeroPayment['Account'] = {
            Code: payment.account_code
        };
    }

    if (payment.account_id) {
        xeroPayment['Account'] = {
            ...xeroPayment['Account'],
            AccountID: payment.account_id
        };
    }

    if (payment.date) {
        const date = new Date(payment.date);
        xeroPayment['Date'] = date.toISOString().split('T')[0];
    }

    if (payment.invoice_id) {
        xeroPayment['Invoice'] = {
            InvoiceID: payment.invoice_id
        };
    }

    if (payment.credit_note_id) {
        xeroPayment['CreditNote'] = {
            CreditNoteID: payment.credit_note_id
        };
    }

    return xeroPayment;
}

function mapFailedXeroPayment(xeroPayment: any): FailedPayment {
    return {
        ...mapXeroPayment(xeroPayment),
        validation_errors: xeroPayment.ValidationErrors
    };
}

// NOTE: The structure returned by PUT /Payments is NOT the same
// as returned by GET /Payments
// This mapping function is correct, do not use the same one as for the sync
function mapXeroPayment(xeroPayment: any): Payment {
    const payment = {
        id: xeroPayment.PaymentID,
        status: xeroPayment.Status,
        invoice_id: xeroPayment.Invoice ? xeroPayment.Invoice.InvoiceID : null,
        credit_note_id: xeroPayment.CreditNote ? xeroPayment.CreditNote.CreditNoteID : null,
        account_code: xeroPayment.Account.Code,
        date: parseDate(xeroPayment.Date).toISOString(),
        amount_cents: parseFloat(xeroPayment.Amount) * 100
    };

    return payment;
}
