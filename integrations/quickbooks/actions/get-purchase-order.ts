import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the purchase order. Example: "123"')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const PurchaseOrderItemSchema = z
    .object({
        Id: z.string().optional(),
        LineNum: z.number().optional(),
        Description: z.string().optional(),
        Amount: z.number().optional(),
        DetailType: z.string().optional()
    })
    .passthrough();

const ProviderPurchaseOrderSchema = z
    .object({
        Id: z.string(),
        DocNumber: z.string().optional(),
        TxnDate: z.string().optional(),
        TotalAmt: z.number().optional(),
        POStatus: z.string().optional(),
        MetaData: MetaDataSchema.optional(),
        Line: z.array(PurchaseOrderItemSchema).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    PurchaseOrder: ProviderPurchaseOrderSchema
});

const OutputSchema = z.object({
    id: z.string(),
    docNumber: z.string().optional(),
    txnDate: z.string().optional(),
    totalAmount: z.number().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    items: z
        .array(
            z.object({
                id: z.string().optional(),
                lineNum: z.number().optional(),
                description: z.string().optional(),
                amount: z.number().optional(),
                detailType: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a QuickBooks purchase order by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config['realmId'];

        if (typeof realmId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/purchaseorder/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Purchase order with ID '${input.id}' was not found`,
                purchaseOrderId: input.id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerPO = providerResponse.PurchaseOrder;

        const mappedItems =
            providerPO.Line?.map((item) => ({
                id: item.Id,
                lineNum: item.LineNum,
                description: item.Description,
                amount: item.Amount,
                detailType: item.DetailType
            })) ?? [];

        return {
            id: providerPO.Id,
            ...(providerPO.DocNumber !== undefined && { docNumber: providerPO.DocNumber }),
            ...(providerPO.TxnDate !== undefined && { txnDate: providerPO.TxnDate }),
            ...(providerPO.TotalAmt !== undefined && { totalAmount: providerPO.TotalAmt }),
            ...(providerPO.POStatus !== undefined && { status: providerPO.POStatus }),
            ...(providerPO.MetaData?.CreateTime !== undefined && { createdAt: providerPO.MetaData.CreateTime }),
            ...(providerPO.MetaData?.LastUpdatedTime !== undefined && { updatedAt: providerPO.MetaData.LastUpdatedTime }),
            ...(mappedItems.length > 0 && { items: mappedItems })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
