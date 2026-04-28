import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().optional().describe('Xero Invoice ID to apply payment to.'),
    credit_note_id: z.string().optional().describe('Xero Credit Note ID to apply payment to.'),
    account_id: z.string().optional().describe('Xero Account ID to pay from.'),
    account_code: z.string().optional().describe('Xero Account Code to pay from.'),
    date: z.string().describe('Payment date in YYYY-MM-DD format.'),
    amount: z.number().describe('Payment amount.'),
    reference: z.string().optional().describe('Optional payment reference.'),
    is_reconciled: z.boolean().optional().describe('Whether the payment should be created as reconciled.')
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const ConnectionsResponseSchema = z.array(z.object({ tenantId: z.string() }));

const AccountsResponseSchema = z.object({
    Accounts: z
        .array(
            z.object({
                AccountID: z.string(),
                Code: z.string().optional()
            })
        )
        .optional()
});

const ValidationErrorSchema = z.object({
    Message: z.string()
});

const PaymentSchema = z.object({
    PaymentID: z.string().optional(),
    Amount: z.number().optional(),
    BankAmount: z.number().optional(),
    Date: z.string().optional(),
    Reference: z.string().optional(),
    Status: z.string().optional(),
    PaymentType: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    HasValidationErrors: z.boolean().optional(),
    ValidationErrors: z.array(ValidationErrorSchema).optional(),
    Account: z
        .object({
            AccountID: z.string().optional(),
            Code: z.string().optional(),
            Name: z.string().optional()
        })
        .optional(),
    Invoice: z
        .object({
            InvoiceID: z.string().optional(),
            InvoiceNumber: z.string().optional(),
            Type: z.string().optional()
        })
        .optional(),
    CreditNote: z
        .object({
            CreditNoteID: z.string().optional(),
            CreditNoteNumber: z.string().optional(),
            Type: z.string().optional()
        })
        .optional()
});

const PaymentsResponseSchema = z.object({
    Payments: z.array(PaymentSchema).optional()
});

const OutputSchema = z.object({
    payment_id: z.string().optional(),
    amount: z.number().optional(),
    bank_amount: z.number().optional(),
    date: z.string().optional(),
    reference: z.string().optional(),
    status: z.string().optional(),
    payment_type: z.string().optional(),
    is_reconciled: z.boolean().optional(),
    has_validation_errors: z.boolean().optional(),
    validation_errors: z.array(z.string()).optional(),
    account: z
        .object({
            account_id: z.string().optional(),
            code: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    invoice: z
        .object({
            invoice_id: z.string().optional(),
            invoice_number: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    credit_note: z
        .object({
            credit_note_id: z.string().optional(),
            credit_note_number: z.string().optional(),
            type: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a payment against an invoice or credit note.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-payment',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.payments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasInvoice = input.invoice_id !== undefined && input.invoice_id.length > 0;
        const hasCreditNote = input.credit_note_id !== undefined && input.credit_note_id.length > 0;
        if ((hasInvoice && hasCreditNote) || (!hasInvoice && !hasCreditNote)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of invoice_id or credit_note_id must be provided.'
            });
        }

        const hasAccountId = input.account_id !== undefined && input.account_id.length > 0;
        const hasAccountCode = input.account_code !== undefined && input.account_code.length > 0;
        if ((hasAccountId && hasAccountCode) || (!hasAccountId && !hasAccountCode)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of account_id or account_code must be provided.'
            });
        }

        const connection = ConnectionSchema.parse(await nango.getConnection());
        let tenantId: string | undefined;

        if (connection.connection_config) {
            const configRecord = z.record(z.string(), z.unknown()).parse(connection.connection_config);
            const value = configRecord['tenant_id'];
            if (typeof value === 'string' && value.length > 0) {
                tenantId = value;
            }
        }

        if (!tenantId && connection.metadata) {
            const metaRecord = z.record(z.string(), z.unknown()).parse(connection.metadata);
            const value = metaRecord['tenantId'];
            if (typeof value === 'string' && value.length > 0) {
                tenantId = value;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/connections/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const parsed = ConnectionsResponseSchema.parse(connectionsResponse.data);
            if (parsed.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (parsed.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const firstConnection = parsed[0];
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant',
                message: 'Unable to resolve Xero tenant ID.'
            });
        }

        let resolvedAccountId = input.account_id;
        if (hasAccountCode) {
            // https://developer.xero.com/documentation/api/accounting/accounts
            const accountsResponse = await nango.get({
                endpoint: 'api.xro/2.0/Accounts',
                retries: 3,
                headers: {
                    'xero-tenant-id': tenantId
                }
            });
            const parsed = AccountsResponseSchema.parse(accountsResponse.data);
            const accounts = parsed.Accounts || [];
            const match = accounts.find((a) => a.Code === input.account_code);
            if (!match) {
                throw new nango.ActionError({
                    type: 'account_not_found',
                    message: `No account found with code "${input.account_code}".`
                });
            }
            resolvedAccountId = match.AccountID;
        }

        const paymentBody: { [key: string]: unknown } = {
            Account: {
                AccountID: resolvedAccountId
            },
            Date: input.date,
            Amount: input.amount
        };
        if (input.reference !== undefined) {
            paymentBody['Reference'] = input.reference;
        }
        if (input.is_reconciled !== undefined) {
            paymentBody['IsReconciled'] = input.is_reconciled;
        }
        if (hasInvoice) {
            paymentBody['Invoice'] = {
                InvoiceID: input.invoice_id
            };
        } else if (hasCreditNote) {
            paymentBody['CreditNote'] = {
                CreditNoteID: input.credit_note_id
            };
        }

        // https://developer.xero.com/documentation/api/accounting/payments
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Payments',
            data: {
                Payments: [paymentBody]
            },
            retries: 1,
            headers: {
                'xero-tenant-id': tenantId
            }
        });

        const parsedResponse = PaymentsResponseSchema.parse(response.data);
        const payments = parsedResponse.Payments || [];
        if (payments.length === 0) {
            throw new nango.ActionError({
                type: 'no_payment_created',
                message: 'No payment was returned from Xero.'
            });
        }

        const payment = payments[0];
        if (!payment) {
            throw new nango.ActionError({
                type: 'no_payment_created',
                message: 'No payment was returned from Xero.'
            });
        }

        const validationErrors = payment.ValidationErrors || [];
        if (payment.HasValidationErrors && validationErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: validationErrors.map((e) => e.Message).join('; ')
            });
        }

        return {
            payment_id: payment.PaymentID,
            amount: payment.Amount,
            bank_amount: payment.BankAmount,
            date: payment.Date,
            reference: payment.Reference,
            status: payment.Status,
            payment_type: payment.PaymentType,
            is_reconciled: payment.IsReconciled,
            has_validation_errors: payment.HasValidationErrors,
            validation_errors: validationErrors.length > 0 ? validationErrors.map((e) => e.Message) : undefined,
            account: payment.Account
                ? {
                      account_id: payment.Account.AccountID,
                      code: payment.Account.Code,
                      name: payment.Account.Name
                  }
                : undefined,
            invoice: payment.Invoice
                ? {
                      invoice_id: payment.Invoice.InvoiceID,
                      invoice_number: payment.Invoice.InvoiceNumber,
                      type: payment.Invoice.Type
                  }
                : undefined,
            credit_note: payment.CreditNote
                ? {
                      credit_note_id: payment.CreditNote.CreditNoteID,
                      credit_note_number: payment.CreditNote.CreditNoteNumber,
                      type: payment.CreditNote.Type
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
