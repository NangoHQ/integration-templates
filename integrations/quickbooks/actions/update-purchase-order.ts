import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('Unique identifier of the purchase order to update. Example: "123"'),
    SyncToken: z.string().describe('SyncToken for concurrency control. Example: "2"'),
    APAccountRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
        .describe('AP account reference for the purchase order'),
    VendorRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
        .describe('Vendor reference for the purchase order'),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                LineNum: z.number().optional(),
                Description: z.string().optional(),
                Amount: z.number().optional(),
                DetailType: z.string().optional(),
                ItemBasedExpenseLineDetail: z
                    .object({
                        ItemRef: z
                            .object({
                                value: z.string(),
                                name: z.string().optional()
                            })
                            .optional(),
                        UnitPrice: z.number().optional(),
                        Qty: z.number().optional()
                    })
                    .optional()
            })
        )
        .optional()
        .describe('Line items for the purchase order'),
    TotalAmt: z.number().optional().describe('Total amount of the purchase order'),
    PurchaseOrderStatus: z.string().optional().describe('Status of the purchase order (e.g., Open, Closed)'),
    Memo: z.string().optional().describe('Memo or notes for the purchase order'),
    PrintStatus: z.string().optional().describe('Print status (NeedToPrint, PrintComplete)')
});

const ProviderResponseSchema = z.object({
    PurchaseOrder: z.object({
        Id: z.string(),
        SyncToken: z.string(),
        MetaData: z
            .object({
                CreateTime: z.string(),
                LastUpdatedTime: z.string()
            })
            .optional(),
        DocNumber: z.string().optional(),
        APAccountRef: z
            .object({
                value: z.string(),
                name: z.string().optional()
            })
            .optional(),
        VendorRef: z
            .object({
                value: z.string(),
                name: z.string().optional()
            })
            .optional(),
        TotalAmt: z.number().optional(),
        PurchaseOrderStatus: z.string().optional()
    })
});

const OutputSchema = z.object({
    Id: z.string().describe('Unique identifier of the updated purchase order'),
    SyncToken: z.string().describe('Updated SyncToken for concurrency control'),
    success: z.boolean().describe('Whether the update was successful')
});

async function getCompany(nango: Parameters<ReturnType<typeof createAction>['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];

    if (!realmId) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }

    return realmId;
}

const action = createAction({
    description: 'Update a QuickBooks purchase order',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        const sparseData: Record<string, unknown> = {
            Id: input.Id,
            SyncToken: input.SyncToken,
            sparse: true
        };

        if (input.APAccountRef !== undefined) {
            sparseData['APAccountRef'] = input.APAccountRef;
        }

        if (input.VendorRef !== undefined) {
            sparseData['VendorRef'] = input.VendorRef;
        }

        if (input.Line !== undefined) {
            sparseData['Line'] = input.Line;
        }

        if (input.TotalAmt !== undefined) {
            sparseData['TotalAmt'] = input.TotalAmt;
        }

        if (input.PurchaseOrderStatus !== undefined) {
            sparseData['PurchaseOrderStatus'] = input.PurchaseOrderStatus;
        }

        if (input.Memo !== undefined) {
            sparseData['Memo'] = input.Memo;
        }

        if (input.PrintStatus !== undefined) {
            sparseData['PrintStatus'] = input.PrintStatus;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/purchaseorder`,
            data: sparseData,
            params: {
                operation: 'update'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const purchaseOrder = parsed.PurchaseOrder;

        return {
            Id: purchaseOrder.Id,
            SyncToken: purchaseOrder.SyncToken,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
