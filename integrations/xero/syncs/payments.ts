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

type Checkpoint = z.infer<typeof CheckpointSchema>;

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

// Zod schema for validating connection response
const ConnectionResponseSchema = z.object({
    connection_config: z.object({ tenant_id: z.string() }).optional(),
    metadata: z.object({ tenantId: z.string() }).optional()
});

// Zod schema for validating connections API response
// Xero Connections API returns an array directly, not wrapped in a data property
const ConnectionSchema = z.object({
    id: z.string().optional(),
    tenantId: z.string().optional(),
    tenantName: z.string().optional(),
    tenantType: z.string().optional(),
    createdDateUtc: z.string().optional(),
    updatedDateUtc: z.string().optional()
});

const ConnectionsArraySchema = z.array(ConnectionSchema);

const sync = createSync({
    description: 'Sync payments from Xero.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/sync-payments' }],
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Use empty string as default for initial run
        const typedCheckpoint: Checkpoint = checkpoint ?? { updatedAfter: '' };

        // Resolve tenant ID from connection config, metadata, or connections API
        // https://developer.xero.com/documentation/api/accounting/overview#tenant-id-resolution
        const connection = await nango.getConnection();

        // Validate connection response with Zod
        const connectionResult = ConnectionResponseSchema.safeParse(connection);
        let tenantId: string | undefined;

        if (connectionResult.success) {
            const conn = connectionResult.data;
            if (conn.connection_config && typeof conn.connection_config.tenant_id === 'string') {
                tenantId = conn.connection_config.tenant_id;
            } else if (conn.metadata && typeof conn.metadata.tenantId === 'string') {
                tenantId = conn.metadata.tenantId;
            }
        }

        if (!tenantId) {
            // Fetch from Connections API
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connections = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            // Validate connections response with Zod
            const connectionsResult = ConnectionsArraySchema.safeParse(connections.data);

            if (!connectionsResult.success) {
                throw new Error('Invalid connections response from Xero API');
            }

            const connectionsData = connectionsResult.data;

            if (connectionsData.length === 0) {
                throw new Error('No Xero tenants found for this connection');
            }

            if (connectionsData.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstConnectionItem = connectionsData[0];
            if (!firstConnectionItem || typeof firstConnectionItem.tenantId !== 'string') {
                throw new Error('Invalid tenant data in connections response');
            }

            tenantId = firstConnectionItem.tenantId;
        }

        if (!tenantId) {
            throw new Error('Unable to resolve Xero tenant ID');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        // Add If-Modified-Since header for incremental sync
        if (typedCheckpoint.updatedAfter) {
            headers['If-Modified-Since'] = typedCheckpoint.updatedAfter;
        }

        // https://developer.xero.com/documentation/api/accounting/payments
        // Xero uses page-based pagination with page parameter
        let page = 1;
        const pageSize = 100;

        while (true) {
            // https://developer.xero.com/documentation/api/accounting/payments
            const response = await nango.get({
                endpoint: 'api.xro/2.0/Payments',
                headers,
                params: {
                    page: page.toString()
                },
                retries: 3
            });

            // Validate response with Zod
            const responseResult = PaymentsResponseSchema.safeParse(response.data);

            if (!responseResult.success) {
                throw new Error('Invalid payments response: ' + responseResult.error.message);
            }

            const paymentsData = responseResult.data.Payments ?? [];

            if (paymentsData.length === 0) {
                break;
            }

            const payments = paymentsData.map((record: unknown) => {
                // Validate payment record with Zod
                const paymentResult = XeroPaymentSchema.safeParse(record);

                if (!paymentResult.success) {
                    throw new Error('Invalid payment record: ' + paymentResult.error.message);
                }

                const payment = paymentResult.data;

                return {
                    id: payment.PaymentID,
                    date: payment.Date ?? null,
                    amount: payment.Amount ?? null,
                    currencyRate: payment.CurrencyRate ?? null,
                    paymentType: payment.PaymentType ?? null,
                    status: payment.Status ?? null,
                    updatedDateUtc: payment.UpdatedDateUTC ?? null,
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

            if (payments.length > 0) {
                await nango.batchSave(payments, 'Payment');

                // Save checkpoint with the most recent UpdatedDateUTC
                const validDates = payments.map((p) => p.updatedDateUtc).filter((d): d is string => d !== null);

                if (validDates.length > 0) {
                    // Sort and get the latest date
                    validDates.sort();
                    const latestDate = validDates[validDates.length - 1];
                    if (latestDate) {
                        await nango.saveCheckpoint({
                            updatedAfter: latestDate
                        });
                    }
                }
            }

            // Check if there are more pages
            const pagination = responseResult.data.pagination;
            const totalPages = pagination?.pageCount ?? 1;

            if (page >= totalPages || paymentsData.length < pageSize) {
                break;
            }

            page += 1;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
