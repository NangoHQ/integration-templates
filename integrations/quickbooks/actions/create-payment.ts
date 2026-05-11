import { z } from 'zod';
import { createAction } from 'nango';

// Input schemas
const LinkedTransactionSchema = z.object({
    TxnId: z.string().describe('The ID of the transaction to link to. Example: "123"'),
    TxnType: z.string().describe('The type of transaction. Example: "Invoice"')
});

const PaymentLineSchema = z.object({
    Amount: z.number().describe('The amount applied to this line. Example: 100.00'),
    LinkedTxn: z.array(LinkedTransactionSchema).optional().describe('Linked transactions (e.g., invoices to apply payment to)')
});

const CustomerRefSchema = z.object({
    value: z.string().describe('Customer ID. Example: "1"'),
    name: z.string().optional().describe('Customer name')
});

const InputSchema = z.object({
    CustomerRef: CustomerRefSchema.describe('Reference to the customer making the payment'),
    TotalAmt: z.number().describe('Total amount of the payment. Example: 100.00'),
    Line: z.array(PaymentLineSchema).optional().describe('Payment lines with linked transactions'),
    PaymentMethodRef: z
        .object({
            value: z.string().describe('Payment method ID')
        })
        .optional()
        .describe('Payment method reference'),
    DepositToAccountRef: z
        .object({
            value: z.string().describe('Account ID to deposit to')
        })
        .optional()
        .describe('Account to deposit the payment to'),
    PrivateNote: z.string().optional().describe('Private note for the payment'),
    TxnDate: z.string().optional().describe('Transaction date in YYYY-MM-DD format')
});

// Provider response schemas
const ProviderCustomerRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const ProviderLinkedTxnSchema = z.object({
    TxnId: z.string(),
    TxnType: z.string()
});

const ProviderPaymentLineSchema = z.object({
    Amount: z.number(),
    LinkedTxn: z.array(ProviderLinkedTxnSchema).optional()
});

const ProviderMetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const ProviderPaymentSchema = z.object({
    Id: z.string(),
    CustomerRef: ProviderCustomerRefSchema,
    TotalAmt: z.number(),
    Line: z.array(ProviderPaymentLineSchema).optional(),
    PaymentMethodRef: z
        .object({
            value: z.string()
        })
        .optional(),
    DepositToAccountRef: z
        .object({
            value: z.string()
        })
        .optional(),
    PrivateNote: z.string().optional(),
    TxnDate: z.string().optional(),
    MetaData: ProviderMetaDataSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Payment ID'),
    customer_id: z.string().describe('Customer ID'),
    customer_name: z.string().optional().describe('Customer name'),
    total_amount: z.number().describe('Total payment amount'),
    lines: z
        .array(
            z.object({
                amount: z.number().describe('Line amount'),
                linked_transactions: z
                    .array(
                        z.object({
                            txn_id: z.string().describe('Transaction ID'),
                            txn_type: z.string().describe('Transaction type')
                        })
                    )
                    .optional()
            })
        )
        .optional()
        .describe('Payment lines'),
    payment_method_id: z.string().optional().describe('Payment method ID'),
    deposit_account_id: z.string().optional().describe('Deposit account ID'),
    private_note: z.string().optional().describe('Private note'),
    txn_date: z.string().optional().describe('Transaction date'),
    created_at: z.string().optional().describe('Creation timestamp'),
    updated_at: z.string().optional().describe('Last update timestamp')
});

async function getCompany(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];

    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }

    return realmId;
}

const action = createAction({
    description: 'Record a customer payment against invoices',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-payment',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#create-a-payment
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/payment`,
            data: input,
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from QuickBooks API'
            });
        }

        // Define response wrapper schema to avoid type assertions
        const ResponseWrapperSchema = z.object({
            Payment: ProviderPaymentSchema
        });

        // Parse the full response - QuickBooks wraps the entity in a Payment field
        const parsedResponse = ResponseWrapperSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response format from QuickBooks API',
                details: parsedResponse.error.message
            });
        }

        const providerPayment = parsedResponse.data.Payment;

        return {
            id: providerPayment.Id,
            customer_id: providerPayment.CustomerRef.value,
            ...(providerPayment.CustomerRef.name !== undefined && {
                customer_name: providerPayment.CustomerRef.name
            }),
            total_amount: providerPayment.TotalAmt,
            ...(providerPayment.Line !== undefined && {
                lines: providerPayment.Line.map((line) => ({
                    amount: line.Amount,
                    ...(line.LinkedTxn !== undefined && {
                        linked_transactions: line.LinkedTxn.map((txn) => ({
                            txn_id: txn.TxnId,
                            txn_type: txn.TxnType
                        }))
                    })
                }))
            }),
            ...(providerPayment.PaymentMethodRef !== undefined && {
                payment_method_id: providerPayment.PaymentMethodRef.value
            }),
            ...(providerPayment.DepositToAccountRef !== undefined && {
                deposit_account_id: providerPayment.DepositToAccountRef.value
            }),
            ...(providerPayment.PrivateNote !== undefined && {
                private_note: providerPayment.PrivateNote
            }),
            ...(providerPayment.TxnDate !== undefined && {
                txn_date: providerPayment.TxnDate
            }),
            ...(providerPayment.MetaData?.CreateTime !== undefined && {
                created_at: providerPayment.MetaData.CreateTime
            }),
            ...(providerPayment.MetaData?.LastUpdatedTime !== undefined && {
                updated_at: providerPayment.MetaData.LastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
