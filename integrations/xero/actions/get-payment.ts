import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        paymentId: z.string().describe('The unique Xero Payment ID to retrieve. Example: "51194409-9530-4ff9-aa72-7c415273c723"')
    })
    .describe('Input for retrieving a Xero payment by ID.');

const InvoiceRefSchema = z.object({
    invoiceId: z.string().optional().describe('The Xero Invoice ID associated with this payment.'),
    invoiceNumber: z.string().optional().describe('The invoice number.')
});

const AccountRefSchema = z.object({
    accountId: z.string().optional().describe('The Xero Account ID used for this payment.'),
    code: z.string().optional().describe('The account code.'),
    name: z.string().optional().describe('The account name.')
});

const OutputSchema = z
    .object({
        paymentId: z.string().describe('The unique Xero Payment ID.'),
        date: z.string().optional().describe('The payment date in YYYY-MM-DD format.'),
        amount: z.number().optional().describe('The payment amount.'),
        status: z.string().optional().describe('The payment status. Example: AUTHORISED, DELETED.'),
        paymentType: z.string().optional().describe('The payment type. Example: ACCRECPAYMENT, ACCPAYPAYMENT.'),
        updatedDateUtc: z.string().optional().describe('The last modified timestamp in UTC.'),
        invoice: InvoiceRefSchema.optional().describe('The invoice this payment is applied to.'),
        account: AccountRefSchema.optional().describe('The bank account the payment was made from/to.')
    })
    .describe('A Xero Payment record.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing payment from the Xero Accounting API.
 * @pitfalls: Deleted payments remain retrievable with status DELETED rather than returning a not-found error. Date and timestamp fields are returned in Xero's /Date(...)/ JSON format instead of ISO-8601 or YYYY-MM-DD.
 */
const action = createAction({
    description: 'Retrieve a payment by PaymentID.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.payments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let tenantId: string | undefined;

        if (
            typeof connection.connection_config === 'object' &&
            connection.connection_config !== null &&
            'tenant_id' in connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (
            !tenantId &&
            typeof connection.metadata === 'object' &&
            connection.metadata !== null &&
            'tenantId' in connection.metadata &&
            typeof connection.metadata['tenantId'] === 'string' &&
            connection.metadata['tenantId'].length > 0
        ) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionsSchema = z.object({
                data: z.array(z.unknown())
            });
            const parsed = ConnectionsSchema.parse(connectionsResponse);

            if (parsed.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (parsed.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const ConnectionItemSchema = z
                .object({
                    tenantId: z.unknown().optional()
                })
                .passthrough();
            const first = ConnectionItemSchema.parse(parsed.data[0]);
            if (typeof first.tenantId === 'string' && first.tenantId.length > 0) {
                tenantId = first.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: `api.xro/2.0/Payments/${encodeURIComponent(input.paymentId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            Payments: z.array(z.unknown()).optional()
        });
        const parsedResponse = ProviderResponseSchema.parse(response.data || {});

        if (!parsedResponse.Payments || parsedResponse.Payments.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Payment with ID "${input.paymentId}" was not found.`
            });
        }

        const RawPaymentSchema = z
            .object({
                PaymentID: z.unknown().optional(),
                Date: z.unknown().optional(),
                Amount: z.unknown().optional(),
                Status: z.unknown().optional(),
                PaymentType: z.unknown().optional(),
                UpdatedDateUTC: z.unknown().optional(),
                Invoice: z.unknown().optional(),
                Account: z.unknown().optional()
            })
            .passthrough();
        const rawPayment = RawPaymentSchema.parse(parsedResponse.Payments[0]);

        const invoiceRaw =
            rawPayment.Invoice !== undefined && rawPayment.Invoice !== null && typeof rawPayment.Invoice === 'object'
                ? z
                      .object({
                          InvoiceID: z.unknown().optional(),
                          InvoiceNumber: z.unknown().optional()
                      })
                      .passthrough()
                      .parse(rawPayment.Invoice)
                : undefined;

        const accountRaw =
            rawPayment.Account !== undefined && rawPayment.Account !== null && typeof rawPayment.Account === 'object'
                ? z
                      .object({
                          AccountID: z.unknown().optional(),
                          Code: z.unknown().optional(),
                          Name: z.unknown().optional()
                      })
                      .passthrough()
                      .parse(rawPayment.Account)
                : undefined;

        return {
            paymentId: rawPayment.PaymentID !== undefined ? String(rawPayment.PaymentID) : input.paymentId,
            ...(rawPayment.Date !== undefined && { date: String(rawPayment.Date) }),
            ...(rawPayment.Amount !== undefined && { amount: Number(rawPayment.Amount) }),
            ...(rawPayment.Status !== undefined && { status: String(rawPayment.Status) }),
            ...(rawPayment.PaymentType !== undefined && { paymentType: String(rawPayment.PaymentType) }),
            ...(rawPayment.UpdatedDateUTC !== undefined && { updatedDateUtc: String(rawPayment.UpdatedDateUTC) }),
            ...(invoiceRaw !== undefined && {
                invoice: {
                    ...(invoiceRaw.InvoiceID !== undefined && { invoiceId: String(invoiceRaw.InvoiceID) }),
                    ...(invoiceRaw.InvoiceNumber !== undefined && { invoiceNumber: String(invoiceRaw.InvoiceNumber) })
                }
            }),
            ...(accountRaw !== undefined && {
                account: {
                    ...(accountRaw.AccountID !== undefined && { accountId: String(accountRaw.AccountID) }),
                    ...(accountRaw.Code !== undefined && { code: String(accountRaw.Code) }),
                    ...(accountRaw.Name !== undefined && { name: String(accountRaw.Name) })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
