import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Payment ID. Example: "123"')
});

const ProviderPaymentSchema = z.object({
    Id: z.string(),
    TotalAmt: z.number().optional(),
    CustomerRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    DepositToAccountRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    PaymentMethodRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    PaymentRefNum: z.string().optional(),
    TxnDate: z.string().optional(),
    PrivateNote: z.string().optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .optional(),
    Line: z
        .array(
            z.object({
                Amount: z.number().optional(),
                LinkedTxn: z
                    .array(
                        z.object({
                            TxnId: z.string().optional(),
                            TxnType: z.string().optional()
                        })
                    )
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    total_amount: z.number().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    deposit_to_account_id: z.string().optional(),
    payment_method_id: z.string().optional(),
    payment_reference: z.string().optional(),
    transaction_date: z.string().optional(),
    private_note: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    line_items: z
        .array(
            z.object({
                amount: z.number().optional(),
                linked_transactions: z
                    .array(
                        z.object({
                            transaction_id: z.string().optional(),
                            transaction_type: z.string().optional()
                        })
                    )
                    .optional()
            })
        )
        .optional()
});

async function getRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const connectionConfig = connection.connection_config;
    if (!connectionConfig) {
        throw new nango.ActionError({
            type: 'invalid_connection',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    const realmId = connectionConfig['realmId'];
    if (typeof realmId !== 'string' || !realmId) {
        throw new nango.ActionError({
            type: 'invalid_connection',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

const action = createAction({
    description: 'Retrieve a payment by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-payment'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/payment/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Payment not found',
                id: input.id
            });
        }

        const ProviderResponseSchema = z.object({
            Payment: ProviderPaymentSchema
        });
        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerPayment = providerResponse.Payment;

        return {
            id: providerPayment.Id,
            ...(providerPayment.TotalAmt !== undefined && { total_amount: providerPayment.TotalAmt }),
            ...(providerPayment.CustomerRef?.value !== undefined && {
                customer_id: providerPayment.CustomerRef.value
            }),
            ...(providerPayment.CustomerRef?.name !== undefined && {
                customer_name: providerPayment.CustomerRef.name
            }),
            ...(providerPayment.DepositToAccountRef?.value !== undefined && {
                deposit_to_account_id: providerPayment.DepositToAccountRef.value
            }),
            ...(providerPayment.PaymentMethodRef?.value !== undefined && {
                payment_method_id: providerPayment.PaymentMethodRef.value
            }),
            ...(providerPayment.PaymentRefNum !== undefined && {
                payment_reference: providerPayment.PaymentRefNum
            }),
            ...(providerPayment.TxnDate !== undefined && { transaction_date: providerPayment.TxnDate }),
            ...(providerPayment.PrivateNote !== undefined && { private_note: providerPayment.PrivateNote }),
            ...(providerPayment.MetaData?.CreateTime !== undefined && {
                created_at: providerPayment.MetaData.CreateTime
            }),
            ...(providerPayment.MetaData?.LastUpdatedTime !== undefined && {
                updated_at: providerPayment.MetaData.LastUpdatedTime
            }),
            ...(providerPayment.Line !== undefined && {
                line_items: providerPayment.Line.map((line) => ({
                    ...(line.Amount !== undefined && { amount: line.Amount }),
                    ...(line.LinkedTxn !== undefined && {
                        linked_transactions: line.LinkedTxn.map((txn) => ({
                            ...(txn.TxnId !== undefined && { transaction_id: txn.TxnId }),
                            ...(txn.TxnType !== undefined && { transaction_type: txn.TxnType })
                        }))
                    })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
