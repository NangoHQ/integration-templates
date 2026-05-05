import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor. Format: STARTPOSITION value. Omit for the first page.')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const CustomerRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const PaymentMethodRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const AccountRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const PaymentLineSchema = z.object({
    Amount: z.number(),
    LinkedTxn: z
        .array(
            z.object({
                TxnId: z.string(),
                TxnType: z.string()
            })
        )
        .optional()
});

const PaymentSchema = z.object({
    Id: z.string(),
    domain: z.string().optional(),
    Sparse: z.boolean().optional(),
    SyncToken: z.string(),
    MetaData: MetaDataSchema.optional(),
    CustomerRef: CustomerRefSchema,
    TxnDate: z.string(),
    TotalAmt: z.number(),
    UnappliedAmt: z.number().optional(),
    PaymentRefNum: z.string().optional(),
    PaymentMethodRef: PaymentMethodRefSchema.optional(),
    DepositToAccountRef: AccountRefSchema.optional(),
    Status: z.string().optional(),
    Line: z.array(PaymentLineSchema).optional()
});

const QueryResponseSchema = z.object({
    Payment: z.array(PaymentSchema).optional(),
    startPosition: z.number().optional(),
    maxResults: z.number().optional(),
    totalCount: z.number().optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const OutputPaymentSchema = z.object({
    id: z.string(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    sync_token: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    customer_id: z.string(),
    customer_name: z.string().optional(),
    txn_date: z.string(),
    total_amount: z.number(),
    unapplied_amount: z.number().optional(),
    payment_ref_number: z.string().optional(),
    payment_method_id: z.string().optional(),
    payment_method_name: z.string().optional(),
    deposit_to_account_id: z.string().optional(),
    deposit_to_account_name: z.string().optional(),
    status: z.string().optional(),
    lines: z
        .array(
            z.object({
                amount: z.number(),
                linked_transactions: z
                    .array(
                        z.object({
                            txn_id: z.string(),
                            txn_type: z.string()
                        })
                    )
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    payments: z.array(OutputPaymentSchema),
    next_cursor: z.string().optional()
});

function toOutputPayment(payment: z.infer<typeof PaymentSchema>): z.infer<typeof OutputPaymentSchema> {
    return {
        id: payment.Id,
        domain: payment.domain,
        sparse: payment.Sparse,
        sync_token: payment.SyncToken,
        created_at: payment.MetaData?.CreateTime,
        updated_at: payment.MetaData?.LastUpdatedTime,
        customer_id: payment.CustomerRef.value,
        customer_name: payment.CustomerRef.name,
        txn_date: payment.TxnDate,
        total_amount: payment.TotalAmt,
        unapplied_amount: payment.UnappliedAmt,
        payment_ref_number: payment.PaymentRefNum,
        payment_method_id: payment.PaymentMethodRef?.value,
        payment_method_name: payment.PaymentMethodRef?.name,
        deposit_to_account_id: payment.DepositToAccountRef?.value,
        deposit_to_account_name: payment.DepositToAccountRef?.name,
        status: payment.Status,
        lines: payment.Line?.map((line) => ({
            amount: line.Amount,
            linked_transactions: line.LinkedTxn?.map((txn) => ({
                txn_id: txn.TxnId,
                txn_type: txn.TxnType
            }))
        }))
    };
}

async function getRealmId(nango: Parameters<ReturnType<typeof createAction>['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return String(realmId);
}

const action = createAction({
    description: 'List payments using the QuickBooks query endpoint.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-payments',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);
        const startPosition = input.cursor ? parseInt(input.cursor, 10) : 1;
        const maxResults = 100;

        const query = `SELECT * FROM Payment STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            data: query,
            headers: {
                'Content-Type': 'application/text'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const payments = parsed.QueryResponse.Payment ?? [];
        const totalCount = parsed.QueryResponse.totalCount ?? 0;

        const hasMore = payments.length === maxResults && startPosition - 1 + payments.length < totalCount;
        const nextCursor = hasMore ? String(startPosition + maxResults) : undefined;

        return {
            payments: payments.map(toOutputPayment),
            next_cursor: nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
