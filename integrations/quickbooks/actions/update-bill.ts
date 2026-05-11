import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('The unique identifier of the bill to update. Example: "123"'),
    SyncToken: z.string().describe('The current sync token for optimistic locking. Must be fetched from a prior read. Example: "0"'),
    sparse: z.boolean().optional().describe('Set to true for sparse updates (only specified fields are updated). Default: true'),
    VendorRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Vendor reference for the bill'),
    APAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Accounts Payable account reference'),
    TxnDate: z.string().optional().describe('Transaction date in YYYY-MM-DD format'),
    DueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    DocNumber: z.string().optional().describe('Document number for the bill'),
    PrivateNote: z.string().optional().describe('Private note for internal use'),
    TotalAmt: z.number().optional().describe('Total amount of the bill'),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                LineNum: z.number().optional(),
                Description: z.string().optional(),
                Amount: z.number(),
                DetailType: z.string(),
                AccountBasedExpenseLineDetail: z
                    .object({
                        AccountRef: z.object({
                            value: z.string(),
                            name: z.string().optional()
                        }),
                        BillableStatus: z.string().optional(),
                        TaxCodeRef: z
                            .object({
                                value: z.string()
                            })
                            .optional()
                    })
                    .optional(),
                ItemBasedExpenseLineDetail: z
                    .object({
                        ItemRef: z.object({
                            value: z.string(),
                            name: z.string().optional()
                        }),
                        Qty: z.number().optional(),
                        UnitPrice: z.number().optional(),
                        BillableStatus: z.string().optional(),
                        TaxCodeRef: z
                            .object({
                                value: z.string()
                            })
                            .optional()
                    })
                    .optional()
            })
        )
        .optional()
        .describe('Line items for the bill')
});

const VendorRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const AccountRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const LineDetailSchema = z.object({
    AccountRef: z.object({
        value: z.string(),
        name: z.string().optional()
    }),
    BillableStatus: z.string().optional(),
    TaxCodeRef: z.object({ value: z.string() }).optional()
});

const ItemBasedLineDetailSchema = z.object({
    ItemRef: z.object({
        value: z.string(),
        name: z.string().optional()
    }),
    Qty: z.number().optional(),
    UnitPrice: z.number().optional(),
    BillableStatus: z.string().optional(),
    TaxCodeRef: z.object({ value: z.string() }).optional()
});

const LineSchema = z.object({
    Id: z.string().optional(),
    LineNum: z.number().optional(),
    Description: z.string().optional(),
    Amount: z.number(),
    DetailType: z.string(),
    AccountBasedExpenseLineDetail: LineDetailSchema.optional(),
    ItemBasedExpenseLineDetail: ItemBasedLineDetailSchema.optional()
});

const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const ProviderBillSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    MetaData: MetaDataSchema.optional(),
    VendorRef: VendorRefSchema.optional(),
    APAccountRef: AccountRefSchema.optional(),
    TxnDate: z.string().optional(),
    DueDate: z.string().optional(),
    DocNumber: z.string().optional(),
    PrivateNote: z.string().optional(),
    TotalAmt: z.number().optional(),
    Balance: z.number().optional(),
    Line: z.array(LineSchema).optional()
});

const OutputSchema = z.object({
    Id: z.string().describe('The unique identifier of the updated bill'),
    SyncToken: z.string().describe('The new sync token after update'),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .optional(),
    VendorRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    APAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    TxnDate: z.string().optional(),
    DueDate: z.string().optional(),
    DocNumber: z.string().optional(),
    PrivateNote: z.string().optional(),
    TotalAmt: z.number().optional(),
    Balance: z.number().optional(),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                LineNum: z.number().optional(),
                Description: z.string().optional(),
                Amount: z.number(),
                DetailType: z.string(),
                AccountBasedExpenseLineDetail: z
                    .object({
                        AccountRef: z.object({
                            value: z.string(),
                            name: z.string().optional()
                        }),
                        BillableStatus: z.string().optional(),
                        TaxCodeRef: z
                            .object({
                                value: z.string()
                            })
                            .optional()
                    })
                    .optional(),
                ItemBasedExpenseLineDetail: z
                    .object({
                        ItemRef: z.object({
                            value: z.string(),
                            name: z.string().optional()
                        }),
                        Qty: z.number().optional(),
                        UnitPrice: z.number().optional(),
                        BillableStatus: z.string().optional(),
                        TaxCodeRef: z.object({ value: z.string() }).optional()
                    })
                    .optional()
            })
        )
        .optional()
});

/**
 * @allowTryCatch
 * Helper to get the realmId from connection configuration.
 * QuickBooks requires realmId (company ID) in every API request path.
 */
async function getRealmId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];

    if (typeof realmId !== 'string' || !realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }

    return realmId;
}

const action = createAction({
    description: 'Update a bill using its current SyncToken',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-bill',
        group: 'Bills'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // Build sparse update payload - only include fields that are present
        const updatePayload: Record<string, unknown> = {
            Id: input.Id,
            SyncToken: input.SyncToken,
            sparse: input.sparse !== false // Default to true for sparse updates
        };

        if (input.VendorRef !== undefined) {
            updatePayload['VendorRef'] = input.VendorRef;
        }

        if (input.APAccountRef !== undefined) {
            updatePayload['APAccountRef'] = input.APAccountRef;
        }

        if (input.TxnDate !== undefined) {
            updatePayload['TxnDate'] = input.TxnDate;
        }

        if (input.DueDate !== undefined) {
            updatePayload['DueDate'] = input.DueDate;
        }

        if (input.DocNumber !== undefined) {
            updatePayload['DocNumber'] = input.DocNumber;
        }

        if (input.PrivateNote !== undefined) {
            updatePayload['PrivateNote'] = input.PrivateNote;
        }

        if (input.TotalAmt !== undefined) {
            updatePayload['TotalAmt'] = input.TotalAmt;
        }

        if (input.Line !== undefined) {
            updatePayload['Line'] = input.Line;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill#update-a-bill
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/bill`,
            data: updatePayload,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to update bill: empty response from QuickBooks API'
            });
        }

        // QuickBooks wraps the response in a Bill property
        const billData =
            response.data &&
            typeof response.data === 'object' &&
            'Bill' in response.data &&
            response.data.Bill !== null &&
            typeof response.data.Bill === 'object'
                ? response.data.Bill
                : response.data;

        const providerBill = ProviderBillSchema.parse(billData);

        return {
            Id: providerBill.Id,
            SyncToken: providerBill.SyncToken,
            ...(providerBill.domain !== undefined && { domain: providerBill.domain }),
            ...(providerBill.sparse !== undefined && { sparse: providerBill.sparse }),
            ...(providerBill.MetaData !== undefined && { MetaData: providerBill.MetaData }),
            ...(providerBill.VendorRef !== undefined && { VendorRef: providerBill.VendorRef }),
            ...(providerBill.APAccountRef !== undefined && { APAccountRef: providerBill.APAccountRef }),
            ...(providerBill.TxnDate !== undefined && { TxnDate: providerBill.TxnDate }),
            ...(providerBill.DueDate !== undefined && { DueDate: providerBill.DueDate }),
            ...(providerBill.DocNumber !== undefined && { DocNumber: providerBill.DocNumber }),
            ...(providerBill.PrivateNote !== undefined && { PrivateNote: providerBill.PrivateNote }),
            ...(providerBill.TotalAmt !== undefined && { TotalAmt: providerBill.TotalAmt }),
            ...(providerBill.Balance !== undefined && { Balance: providerBill.Balance }),
            ...(providerBill.Line !== undefined && { Line: providerBill.Line })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
