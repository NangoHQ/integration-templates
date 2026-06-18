import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    updated_after: z.string().optional().describe('Filter for purchase orders updated after this ISO timestamp')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const VendorRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const APAccountRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const LinkedTxnSchema = z.object({
    TxnId: z.string().optional(),
    TxnType: z.string().optional()
});

const ItemBasedExpenseLineDetailSchema = z
    .object({
        ItemRef: z
            .object({
                value: z.string().optional(),
                name: z.string().optional()
            })
            .optional(),
        Qty: z.number().optional(),
        UnitPrice: z.number().optional()
    })
    .passthrough();

const AccountBasedExpenseLineDetailSchema = z
    .object({
        AccountRef: z
            .object({
                value: z.string().optional(),
                name: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const LineSchema = z
    .object({
        Id: z.string().optional(),
        Description: z.string().optional(),
        Amount: z.number().optional(),
        DetailType: z.string().optional(),
        ItemBasedExpenseLineDetail: ItemBasedExpenseLineDetailSchema.optional(),
        AccountBasedExpenseLineDetail: AccountBasedExpenseLineDetailSchema.optional()
    })
    .passthrough();

const ProviderPurchaseOrderSchema = z
    .object({
        Id: z.string(),
        APAccountRef: APAccountRefSchema.optional(),
        VendorRef: VendorRefSchema.optional(),
        LinkedTxn: z.array(LinkedTxnSchema).optional(),
        MetaData: MetaDataSchema.optional(),
        POStatus: z.string().optional(),
        DocNumber: z.string().optional(),
        TxnDate: z.string().optional(),
        TotalAmt: z.number().optional(),
        Line: z.array(LineSchema).optional(),
        DueDate: z.string().optional(),
        Memo: z.string().optional()
    })
    .passthrough();

const QueryResponseSchema = z.object({
    PurchaseOrder: z.array(ProviderPurchaseOrderSchema).optional(),
    maxResults: z.number().optional(),
    startPosition: z.number().optional(),
    totalCount: z.number().optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const OutputPurchaseOrderSchema = z.object({
    id: z.string(),
    ap_account_ref: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    vendor_ref: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    linked_transactions: z
        .array(
            z.object({
                txn_id: z.string().optional(),
                txn_type: z.string().optional()
            })
        )
        .optional(),
    metadata: z
        .object({
            create_time: z.string().optional(),
            last_updated_time: z.string().optional()
        })
        .optional(),
    po_status: z.string().optional(),
    doc_number: z.string().optional(),
    txn_date: z.string().optional(),
    total_amount: z.number().optional(),
    line_items: z
        .array(
            z
                .object({
                    id: z.string().optional(),
                    description: z.string().optional(),
                    amount: z.number().optional(),
                    detail_type: z.string().optional(),
                    item_ref: z
                        .object({
                            value: z.string().optional(),
                            name: z.string().optional()
                        })
                        .optional(),
                    quantity: z.number().optional(),
                    unit_price: z.number().optional()
                })
                .passthrough()
        )
        .optional(),
    due_date: z.string().optional(),
    memo: z.string().optional()
});

const OutputSchema = z.object({
    purchase_orders: z.array(OutputPurchaseOrderSchema),
    next_cursor: z.string().optional(),
    total_count: z.number().optional()
});

function toPurchaseOrder(po: z.infer<typeof ProviderPurchaseOrderSchema>): z.infer<typeof OutputPurchaseOrderSchema> {
    const lines = po.Line ?? [];
    const mappedLines = lines.map((line) => {
        const itemRef = line.ItemBasedExpenseLineDetail?.ItemRef;
        return {
            id: line.Id,
            description: line.Description,
            amount: line.Amount,
            detail_type: line.DetailType,
            item_ref: itemRef ? { value: itemRef.value, name: itemRef.name } : undefined,
            quantity: line.ItemBasedExpenseLineDetail?.Qty,
            unit_price: line.ItemBasedExpenseLineDetail?.UnitPrice,
            ...line
        };
    });

    return {
        id: po.Id,
        ap_account_ref: po.APAccountRef ? { value: po.APAccountRef.value, name: po.APAccountRef.name } : undefined,
        vendor_ref: po.VendorRef ? { value: po.VendorRef.value, name: po.VendorRef.name } : undefined,
        linked_transactions: po.LinkedTxn?.map((txn) => ({ txn_id: txn.TxnId, txn_type: txn.TxnType })),
        metadata: po.MetaData ? { create_time: po.MetaData.CreateTime, last_updated_time: po.MetaData.LastUpdatedTime } : undefined,
        po_status: po.POStatus,
        doc_number: po.DocNumber,
        txn_date: po.TxnDate,
        total_amount: po.TotalAmt,
        line_items: mappedLines.length > 0 ? mappedLines : undefined,
        due_date: po.DueDate,
        memo: po.Memo
    };
}

const action = createAction({
    description: 'List QuickBooks purchase orders',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/companyinfo
        const connection = await nango.getConnection();
        const realmId = connection.connection_config?.['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        const purchaseOrders: z.infer<typeof OutputPurchaseOrderSchema>[] = [];
        let startPosition = 1;
        const maxResults = 100;
        let totalCount: number | undefined;

        if (input.updated_after) {
            const parsed = new Date(input.updated_after);
            if (isNaN(parsed.getTime())) {
                throw new nango.ActionError({ type: 'invalid_input', message: 'updated_after must be a valid ISO datetime string' });
            }
        }

        while (true) {
            const filter = input.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${new Date(input.updated_after).toISOString()}'` : '';
            const query = `SELECT * FROM PurchaseOrder${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder#query-a-purchaseorder
            const response = await nango.get({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                params: { query },
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);
            const results = parsed.QueryResponse.PurchaseOrder ?? [];

            if (results.length === 0) {
                break;
            }

            purchaseOrders.push(...results.map(toPurchaseOrder));

            if (totalCount === undefined && parsed.QueryResponse.totalCount !== undefined) {
                totalCount = parsed.QueryResponse.totalCount;
            }

            if (results.length < maxResults) {
                break;
            }

            startPosition += maxResults;
        }

        return {
            purchase_orders: purchaseOrders,
            ...(totalCount !== undefined && { total_count: totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
