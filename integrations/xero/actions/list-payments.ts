import { z } from 'zod';
import { createAction } from 'nango';

// Input schema
const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Starts at 1.'),
    where: z.string().optional().describe('OData filter clause. Example: Status==AUTHORISED'),
    order: z.string().optional().describe('Order by clause. Example: Date DESC'),
    ifModifiedSince: z.string().optional().describe('ISO 8601 timestamp. Only records changed since this time will be returned.')
});

// Payment output schema based on Xero API
const PaymentSchema = z.object({
    PaymentID: z.string().optional(),
    Date: z.string().optional(),
    Amount: z.number().optional(),
    CurrencyRate: z.number().optional(),
    PaymentType: z.string().optional(),
    Status: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
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
            Type: z.string().optional(),
            Reference: z.string().optional()
        })
        .optional(),
    CreditNote: z
        .object({
            CreditNoteID: z.string().optional(),
            CreditNoteNumber: z.string().optional(),
            Type: z.string().optional()
        })
        .optional(),
    Prepayment: z
        .object({
            PrepaymentID: z.string().optional(),
            Reference: z.string().optional()
        })
        .optional(),
    Overpayment: z
        .object({
            OverpaymentID: z.string().optional(),
            Reference: z.string().optional()
        })
        .optional(),
    HasAccount: z.boolean().optional(),
    HasValidationErrors: z.boolean().optional(),
    ValidationErrors: z
        .array(
            z.object({
                Message: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    payments: z.array(PaymentSchema),
    nextCursor: z.union([z.string(), z.null()])
});

function isRecordStringUnknown(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    // 1. Check connection.connection_config.tenant_id
    const connection = await nango.getConnection();
    if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
        const tenantId = connection.connection_config['tenant_id'];
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    // 2. Check connection.metadata.tenantId
    if (connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
        const tenantId = connection.metadata['tenantId'];
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    // 3. Call GET connections endpoint
    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    if (connectionsResponse.data && Array.isArray(connectionsResponse.data)) {
        if (connectionsResponse.data.length === 1) {
            const firstConnection = connectionsResponse.data[0];
            if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                const tenantId = firstConnection['tenantId'];
                if (typeof tenantId === 'string') {
                    return tenantId;
                }
            }
        } else if (connectionsResponse.data.length > 1) {
            throw new nango.ActionError({
                type: 'multiple_tenants',
                message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
            });
        }
    }

    throw new nango.ActionError({
        type: 'missing_tenant_id',
        message: 'Unable to resolve tenant ID. Please set tenant_id in connection_config or tenantId in metadata.'
    });
}

const action = createAction({
    description: 'List payments with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-payments',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input['ifModifiedSince']) {
            headers['If-Modified-Since'] = input['ifModifiedSince'];
        }

        const params: Record<string, string | number> = {};
        if (input['page']) {
            params['page'] = input['page'];
        }
        if (input['where']) {
            params['where'] = input['where'];
        }
        if (input['order']) {
            params['order'] = input['order'];
        }

        // https://developer.xero.com/documentation/api/accounting/payments
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Payments',
            headers,
            params,
            retries: 3
        });

        // Validate response data
        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API'
            });
        }

        if (!isRecordStringUnknown(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Xero API'
            });
        }

        const responseData = response.data;
        const paymentsArray = responseData['Payments'];

        if (!Array.isArray(paymentsArray)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response does not contain a Payments array'
            });
        }

        // Helper function to extract string value
        const getString = (obj: Record<string, unknown>, key: string): string | undefined => {
            const val = obj[key];
            return typeof val === 'string' ? val : undefined;
        };

        // Helper function to extract number value
        const getNumber = (obj: Record<string, unknown>, key: string): number | undefined => {
            const val = obj[key];
            return typeof val === 'number' ? val : undefined;
        };

        // Helper function to extract boolean value
        const getBoolean = (obj: Record<string, unknown>, key: string): boolean | undefined => {
            const val = obj[key];
            return typeof val === 'boolean' ? val : undefined;
        };

        // Helper to parse Account object
        const parseAccount = (accountData: unknown): { AccountID?: string; Code?: string; Name?: string } | undefined => {
            if (!isRecordStringUnknown(accountData)) {
                return undefined;
            }
            const result: { AccountID?: string; Code?: string; Name?: string } = {};
            const accountId = getString(accountData, 'AccountID');
            if (accountId !== undefined) {
                result.AccountID = accountId;
            }
            const code = getString(accountData, 'Code');
            if (code !== undefined) {
                result.Code = code;
            }
            const name = getString(accountData, 'Name');
            if (name !== undefined) {
                result.Name = name;
            }
            return Object.keys(result).length > 0 ? result : undefined;
        };

        // Helper to parse Invoice object
        const parseInvoice = (invoiceData: unknown): { InvoiceID?: string; InvoiceNumber?: string; Type?: string; Reference?: string } | undefined => {
            if (!isRecordStringUnknown(invoiceData)) {
                return undefined;
            }
            const result: { InvoiceID?: string; InvoiceNumber?: string; Type?: string; Reference?: string } = {};
            const invoiceId = getString(invoiceData, 'InvoiceID');
            if (invoiceId !== undefined) {
                result.InvoiceID = invoiceId;
            }
            const invoiceNumber = getString(invoiceData, 'InvoiceNumber');
            if (invoiceNumber !== undefined) {
                result.InvoiceNumber = invoiceNumber;
            }
            const type = getString(invoiceData, 'Type');
            if (type !== undefined) {
                result.Type = type;
            }
            const reference = getString(invoiceData, 'Reference');
            if (reference !== undefined) {
                result.Reference = reference;
            }
            return Object.keys(result).length > 0 ? result : undefined;
        };

        // Helper to parse CreditNote object
        const parseCreditNote = (creditNoteData: unknown): { CreditNoteID?: string; CreditNoteNumber?: string; Type?: string } | undefined => {
            if (!isRecordStringUnknown(creditNoteData)) {
                return undefined;
            }
            const result: { CreditNoteID?: string; CreditNoteNumber?: string; Type?: string } = {};
            const creditNoteId = getString(creditNoteData, 'CreditNoteID');
            if (creditNoteId !== undefined) {
                result.CreditNoteID = creditNoteId;
            }
            const creditNoteNumber = getString(creditNoteData, 'CreditNoteNumber');
            if (creditNoteNumber !== undefined) {
                result.CreditNoteNumber = creditNoteNumber;
            }
            const type = getString(creditNoteData, 'Type');
            if (type !== undefined) {
                result.Type = type;
            }
            return Object.keys(result).length > 0 ? result : undefined;
        };

        // Helper to parse Prepayment object
        const parsePrepayment = (prepaymentData: unknown): { PrepaymentID?: string; Reference?: string } | undefined => {
            if (!isRecordStringUnknown(prepaymentData)) {
                return undefined;
            }
            const result: { PrepaymentID?: string; Reference?: string } = {};
            const prepaymentId = getString(prepaymentData, 'PrepaymentID');
            if (prepaymentId !== undefined) {
                result.PrepaymentID = prepaymentId;
            }
            const reference = getString(prepaymentData, 'Reference');
            if (reference !== undefined) {
                result.Reference = reference;
            }
            return Object.keys(result).length > 0 ? result : undefined;
        };

        // Helper to parse Overpayment object
        const parseOverpayment = (overpaymentData: unknown): { OverpaymentID?: string; Reference?: string } | undefined => {
            if (!isRecordStringUnknown(overpaymentData)) {
                return undefined;
            }
            const result: { OverpaymentID?: string; Reference?: string } = {};
            const overpaymentId = getString(overpaymentData, 'OverpaymentID');
            if (overpaymentId !== undefined) {
                result.OverpaymentID = overpaymentId;
            }
            const reference = getString(overpaymentData, 'Reference');
            if (reference !== undefined) {
                result.Reference = reference;
            }
            return Object.keys(result).length > 0 ? result : undefined;
        };

        // Helper to parse ValidationErrors array
        const parseValidationErrors = (errorsData: unknown): Array<{ Message?: string }> | undefined => {
            if (!Array.isArray(errorsData)) {
                return undefined;
            }
            const result: Array<{ Message?: string }> = [];
            for (const ve of errorsData) {
                if (isRecordStringUnknown(ve)) {
                    const message = getString(ve, 'Message');
                    const errorItem: { Message?: string } = {};
                    if (message !== undefined) {
                        errorItem.Message = message;
                    }
                    if (Object.keys(errorItem).length > 0) {
                        result.push(errorItem);
                    }
                }
            }
            return result.length > 0 ? result : undefined;
        };

        // Map payments
        const payments: z.infer<typeof PaymentSchema>[] = [];
        for (const payment of paymentsArray) {
            if (!isRecordStringUnknown(payment)) {
                continue;
            }
            const mappedPayment: z.infer<typeof PaymentSchema> = {};

            const paymentId = getString(payment, 'PaymentID');
            if (paymentId !== undefined) {
                mappedPayment.PaymentID = paymentId;
            }

            const date = getString(payment, 'Date');
            if (date !== undefined) {
                mappedPayment.Date = date;
            }

            const amount = getNumber(payment, 'Amount');
            if (amount !== undefined) {
                mappedPayment.Amount = amount;
            }

            const currencyRate = getNumber(payment, 'CurrencyRate');
            if (currencyRate !== undefined) {
                mappedPayment.CurrencyRate = currencyRate;
            }

            const paymentType = getString(payment, 'PaymentType');
            if (paymentType !== undefined) {
                mappedPayment.PaymentType = paymentType;
            }

            const status = getString(payment, 'Status');
            if (status !== undefined) {
                mappedPayment.Status = status;
            }

            const updatedDateUtc = getString(payment, 'UpdatedDateUTC');
            if (updatedDateUtc !== undefined) {
                mappedPayment.UpdatedDateUTC = updatedDateUtc;
            }

            const account = parseAccount(payment['Account']);
            if (account !== undefined) {
                mappedPayment.Account = account;
            }

            const invoice = parseInvoice(payment['Invoice']);
            if (invoice !== undefined) {
                mappedPayment.Invoice = invoice;
            }

            const creditNote = parseCreditNote(payment['CreditNote']);
            if (creditNote !== undefined) {
                mappedPayment.CreditNote = creditNote;
            }

            const prepayment = parsePrepayment(payment['Prepayment']);
            if (prepayment !== undefined) {
                mappedPayment.Prepayment = prepayment;
            }

            const overpayment = parseOverpayment(payment['Overpayment']);
            if (overpayment !== undefined) {
                mappedPayment.Overpayment = overpayment;
            }

            const hasAccount = getBoolean(payment, 'HasAccount');
            if (hasAccount !== undefined) {
                mappedPayment.HasAccount = hasAccount;
            }

            const hasValidationErrors = getBoolean(payment, 'HasValidationErrors');
            if (hasValidationErrors !== undefined) {
                mappedPayment.HasValidationErrors = hasValidationErrors;
            }

            const validationErrors = parseValidationErrors(payment['ValidationErrors']);
            if (validationErrors !== undefined) {
                mappedPayment.ValidationErrors = validationErrors;
            }

            payments.push(mappedPayment);
        }

        const currentPage = input['page'] ?? 1;
        const nextCursor = paymentsArray.length === 100 ? String(currentPage + 1) : null;

        return {
            payments,
            nextCursor: nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
