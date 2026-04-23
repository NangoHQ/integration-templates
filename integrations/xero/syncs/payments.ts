import { createSync } from 'nango';
import { z } from 'zod';

// Xero Payment model schema
// https://developer.xero.com/documentation/api/accounting/payments
const PaymentSchema = z.object({
    id: z.string(),
    date: z.union([z.string(), z.null()]),
    amount: z.union([z.number(), z.null()]),
    currencyRate: z.union([z.number(), z.null()]),
    paymentType: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    updatedDateUtc: z.union([z.string(), z.null()]),
    reference: z.union([z.string(), z.null()]),
    isReconciled: z.union([z.boolean(), z.null()]),
    accountId: z.union([z.string(), z.null()]),
    invoiceId: z.union([z.string(), z.null()]),
    creditNoteId: z.union([z.string(), z.null()]),
    prepaymentId: z.union([z.string(), z.null()]),
    overpaymentId: z.union([z.string(), z.null()]),
    bankAccountNumber: z.union([z.string(), z.null()]),
    bankAccountName: z.union([z.string(), z.null()]),
    details: z.union([z.string(), z.null()]),
    hasAttachments: z.union([z.boolean(), z.null()]),
    hasAccountId: z.union([z.boolean(), z.null()]),
    hasValidationErrors: z.union([z.boolean(), z.null()]),
    batchPaymentId: z.union([z.string(), z.null()])
});

// Checkpoint schema - must be Record<string, ZodString | ZodNumber | ZodBoolean>
// No optional fields allowed at top level, use empty string as default
const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

// Zod schema for validating Xero Payment response
const XeroPaymentSchema = z.object({
    PaymentID: z.string(),
    Date: z.string().optional(),
    Amount: z.number().optional(),
    CurrencyRate: z.number().optional(),
    PaymentType: z.string().optional(),
    Status: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    Reference: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    Account: z.object({ AccountID: z.string().optional() }).optional(),
    Invoice: z.object({ InvoiceID: z.string().optional() }).optional(),
    CreditNote: z.object({ CreditNoteID: z.string().optional() }).optional(),
    Prepayment: z.object({ PrepaymentID: z.string().optional() }).optional(),
    Overpayment: z.object({ OverpaymentID: z.string().optional() }).optional(),
    BankAccountNumber: z.string().optional(),
    BankAccountName: z.string().optional(),
    Details: z.string().optional(),
    HasAttachments: z.boolean().optional(),
    HasAccountID: z.boolean().optional(),
    HasValidationErrors: z.boolean().optional(),
    BatchPaymentID: z.string().optional()
});

// Schema for Xero Payments API response
const PaymentsResponseSchema = z.object({
    Payments: z.array(z.unknown()).optional(),
    pagination: z
        .object({
            page: z.number().optional(),
            pageSize: z.number().optional(),
            pageCount: z.number().optional(),
            itemCount: z.number().optional()
        })
        .optional()
});

const ConnectionsArraySchema = z.array(z.object({ tenantId: z.string().optional() }));

const sync = createSync({
    description: 'Sync payments from Xero.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/payments' }],
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const connection = await nango.getConnection();
        let tenantId: string | undefined;

        const configParse = z.object({ tenant_id: z.string().optional() }).safeParse(connection.connection_config);
        if (configParse.success && configParse.data.tenant_id) tenantId = configParse.data.tenant_id;

        if (!tenantId) {
            const metaParse = z.object({ tenantId: z.string().optional() }).safeParse(connection.metadata);
            if (metaParse.success && metaParse.data.tenantId) tenantId = metaParse.data.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connections = await nango.get({ endpoint: 'connections', retries: 10 });
            const connectionsResult = ConnectionsArraySchema.safeParse(connections.data);
            if (!connectionsResult.success) throw new Error('Invalid connections response from Xero API');

            const connectionsData = connectionsResult.data;
            if (connectionsData.length === 0) throw new Error('No Xero tenants found for this connection');
            if (connectionsData.length > 1)
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');

            const firstConnectionItem = connectionsData[0];
            if (!firstConnectionItem?.tenantId) throw new Error('Invalid tenant data in connections response');
            tenantId = firstConnectionItem.tenantId;
        }

        if (!tenantId) throw new Error('Unable to resolve Xero tenant ID');

        const isIncremental = checkpoint && checkpoint.updatedAfter.length > 0;

        const headers: Record<string, string> = { 'xero-tenant-id': tenantId };

        if (isIncremental) {
            headers['If-Modified-Since'] = checkpoint.updatedAfter;
        }

        let page = 1;
        let hasMore = true;
        let latestUpdatedDateUTC = checkpoint?.updatedAfter ?? '';

        while (hasMore) {
            // https://developer.xero.com/documentation/api/accounting/payments
            const response = await nango.get({
                endpoint: 'api.xro/2.0/Payments',
                headers,
                params: {
                    page: page.toString(),
                    includeArchived: isIncremental ? 'true' : 'false'
                },
                retries: 10
            });

            const paymentsData = PaymentsResponseSchema.parse(response.data).Payments ?? [];

            if (paymentsData.length === 0) {
                hasMore = false;
                break;
            }

            const mapped = paymentsData.map((record: unknown) => {
                const payment = XeroPaymentSchema.parse(record);
                const updatedDateUtc = payment.UpdatedDateUTC ?? null;
                if (updatedDateUtc && updatedDateUtc > latestUpdatedDateUTC) latestUpdatedDateUTC = updatedDateUtc;
                return {
                    id: payment.PaymentID,
                    date: payment.Date ?? null,
                    amount: payment.Amount ?? null,
                    currencyRate: payment.CurrencyRate ?? null,
                    paymentType: payment.PaymentType ?? null,
                    status: payment.Status ?? null,
                    updatedDateUtc,
                    reference: payment.Reference ?? null,
                    isReconciled: payment.IsReconciled ?? null,
                    accountId: payment.Account?.AccountID ?? null,
                    invoiceId: payment.Invoice?.InvoiceID ?? null,
                    creditNoteId: payment.CreditNote?.CreditNoteID ?? null,
                    prepaymentId: payment.Prepayment?.PrepaymentID ?? null,
                    overpaymentId: payment.Overpayment?.OverpaymentID ?? null,
                    bankAccountNumber: payment.BankAccountNumber ?? null,
                    bankAccountName: payment.BankAccountName ?? null,
                    details: payment.Details ?? null,
                    hasAttachments: payment.HasAttachments ?? null,
                    hasAccountId: payment.HasAccountID ?? null,
                    hasValidationErrors: payment.HasValidationErrors ?? null,
                    batchPaymentId: payment.BatchPaymentID ?? null
                };
            });

            const activePayments = mapped.filter((p) => p.status !== 'DELETED');
            await nango.batchSave(activePayments, 'Payment');

            if (isIncremental) {
                const deletedPayments = mapped.filter((p) => p.status === 'DELETED');
                await nango.batchDelete(deletedPayments, 'Payment');
            }

            if (paymentsData.length < 100) {
                hasMore = false;
            } else {
                page += 1;
            }
        }

        if (latestUpdatedDateUTC !== (checkpoint?.updatedAfter ?? '')) {
            await nango.saveCheckpoint({ updatedAfter: latestUpdatedDateUTC });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
