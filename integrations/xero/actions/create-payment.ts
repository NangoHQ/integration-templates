import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoice_id: z.string().optional().describe('The ID of the invoice to apply payment to. Example: "00000000-0000-0000-0000-000000000000"'),
        credit_note_id: z.string().optional().describe('The ID of the credit note to apply payment to. Example: "00000000-0000-0000-0000-000000000000"'),
        account_id: z.string().optional().describe('The ID of the bank account to pay from. Example: "00000000-0000-0000-0000-000000000000"'),
        account_code: z.string().optional().describe('The account code of the bank account to pay from. Example: "001"'),
        amount: z.number().describe('The amount of the payment. Example: 100.50'),
        date: z.string().describe('The date of the payment in YYYY-MM-DD format. Example: "2024-01-15"'),
        reference: z.string().optional().describe('Optional reference for the payment. Example: "Payment for Invoice #123"')
    })
    .refine((data) => data.invoice_id || data.credit_note_id, {
        message: 'Either invoice_id or credit_note_id must be provided'
    })
    .refine((data) => data.account_id || data.account_code, {
        message: 'Either account_id or account_code must be provided'
    });

const OutputSchema = z.object({
    payment_id: z.string(),
    status: z.string()
});

interface NangoApi {
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
    ActionError: new (payload: Record<string, unknown>) => Error;
}

interface Connection {
    connection_config?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
}

async function resolveTenantId(nango: NangoApi, connection: Connection): Promise<string> {
    // Check connection_config first
    const connectionConfig = connection.connection_config;
    const configTenantId = connectionConfig?.['tenant_id'];
    if (typeof configTenantId === 'string') {
        return configTenantId;
    }

    // Check metadata second
    const metadata = connection.metadata || {};
    const metadataTenantId = metadata['tenantId'];
    if (typeof metadataTenantId === 'string') {
        return metadataTenantId;
    }

    // Fall back to connections API
    // https://developer.xero.com/documentation/api/accounting/overview
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connections = connectionsResponse.data;
    if (!Array.isArray(connections) || connections.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenants',
            message: 'No tenants found for this connection'
        });
    }

    if (connections.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const tenantId = connections[0]?.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
        throw new nango.ActionError({
            type: 'invalid_tenant',
            message: 'Invalid tenant data returned from connections API'
        });
    }

    return tenantId;
}

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
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const tenantId = await resolveTenantId(nango, connection);

        // Build the payment object
        const payment: Record<string, unknown> = {
            Amount: input.amount,
            Date: input.date
        };

        // Add invoice or credit note reference
        if (input.invoice_id) {
            payment['Invoice'] = { InvoiceID: input.invoice_id };
        } else if (input.credit_note_id) {
            payment['CreditNote'] = { CreditNoteID: input.credit_note_id };
        }

        // Add account reference
        if (input.account_id) {
            payment['Account'] = { AccountID: input.account_id };
        } else if (input.account_code) {
            payment['Account'] = { Code: input.account_code };
        }

        // Add optional reference
        if (input.reference) {
            payment['Reference'] = input.reference;
        }

        // https://developer.xero.com/documentation/api/accounting/payments
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Payments',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Payments: [payment]
            },
            retries: 3
        });

        // Parse response with Zod to avoid type assertions
        const ResponseSchema = z.object({
            Payments: z
                .array(
                    z.object({
                        PaymentID: z.string().optional(),
                        Status: z.string().optional()
                    })
                )
                .optional()
        });

        const parsedResponse = ResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API',
                details: parsedResponse.error?.message || 'Unknown parsing error'
            });
        }

        const payments = parsedResponse.data.Payments;

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            throw new nango.ActionError({
                type: 'no_payment_created',
                message: 'No payment was created'
            });
        }

        const createdPayment = payments[0];

        if (!createdPayment) {
            throw new nango.ActionError({
                type: 'no_payment_created',
                message: 'No payment was created'
            });
        }

        const paymentId = createdPayment.PaymentID;
        const status = createdPayment.Status;

        if (!paymentId || typeof paymentId !== 'string') {
            throw new nango.ActionError({
                type: 'missing_payment_id',
                message: 'Payment was created but no PaymentID was returned'
            });
        }

        return {
            payment_id: paymentId,
            status: status || 'UNKNOWN'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
