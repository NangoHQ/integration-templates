import { z } from 'zod';
import { createAction } from 'nango';

// Input schemas - QuickBooks uses PascalCase for field names
const ExpenseLineDetailSchema = z.object({
    AccountRef: z.object({
        value: z.string().describe('Account ID reference')
    }),
    CustomerRef: z
        .object({
            value: z.string()
        })
        .optional(),
    ClassRef: z
        .object({
            value: z.string()
        })
        .optional(),
    DepartmentRef: z
        .object({
            value: z.string()
        })
        .optional()
});

const ItemBasedExpenseLineDetailSchema = z.object({
    ItemRef: z.object({
        value: z.string().describe('Item ID reference')
    }),
    Qty: z.number().optional(),
    UnitPrice: z.number().optional(),
    CustomerRef: z
        .object({
            value: z.string()
        })
        .optional(),
    ClassRef: z
        .object({
            value: z.string()
        })
        .optional(),
    DepartmentRef: z
        .object({
            value: z.string()
        })
        .optional()
});

const LineSchema = z.object({
    DetailType: z.enum(['AccountBasedExpenseLineDetail', 'ItemBasedExpenseLineDetail']),
    Amount: z.number(),
    Description: z.string().optional(),
    AccountBasedExpenseLineDetail: ExpenseLineDetailSchema.optional(),
    ItemBasedExpenseLineDetail: ItemBasedExpenseLineDetailSchema.optional()
});

const InputSchema = z.object({
    VendorRef: z.object({
        value: z.string().describe('Vendor ID reference. Example: "89"')
    }),
    TxnDate: z.string().describe('Transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
    DueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    Lines: z.array(LineSchema).describe('Line items (expense or item-based)')
});

// Provider response schemas - using PascalCase to match QuickBooks
const ProviderBillSchema = z.object({
    Id: z.string(),
    VendorRef: z.object({
        value: z.string(),
        name: z.string().optional()
    }),
    TxnDate: z.string(),
    DueDate: z.string().optional(),
    TotalAmt: z.number(),
    Balance: z.number().optional(),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                DetailType: z.string(),
                Amount: z.number(),
                Description: z.string().optional()
            })
        )
        .optional(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .optional()
});

// Output schema - normalized to camelCase
const OutputSchema = z.object({
    id: z.string(),
    vendorId: z.string(),
    vendorName: z.string().optional(),
    transactionDate: z.string(),
    dueDate: z.string().optional(),
    totalAmount: z.number(),
    balance: z.number().optional(),
    lines: z
        .array(
            z.object({
                id: z.string().optional(),
                detailType: z.string(),
                amount: z.number(),
                description: z.string().optional()
            })
        )
        .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

async function getRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];

    if (!realmId) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }

    return realmId;
}

const action = createAction({
    description: 'Create a vendor bill with expense or item lines',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/bill`,
            data: {
                VendorRef: input.VendorRef,
                TxnDate: input.TxnDate,
                ...(input.DueDate !== undefined && { DueDate: input.DueDate }),
                Line: input.Lines
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create bill - no data returned from QuickBooks API'
            });
        }

        // QuickBooks may return the Bill wrapped in a Bill object or directly
        const billData = response.data.Bill || response.data;
        const providerBill = ProviderBillSchema.parse(billData);

        return {
            id: providerBill.Id,
            vendorId: providerBill.VendorRef.value,
            ...(providerBill.VendorRef.name !== undefined && {
                vendorName: providerBill.VendorRef.name
            }),
            transactionDate: providerBill.TxnDate,
            ...(providerBill.DueDate !== undefined && { dueDate: providerBill.DueDate }),
            totalAmount: providerBill.TotalAmt,
            ...(providerBill.Balance !== undefined && { balance: providerBill.Balance }),
            ...(providerBill.Line !== undefined && {
                lines: providerBill.Line.map((line) => ({
                    ...(line.Id !== undefined && { id: line.Id }),
                    detailType: line.DetailType,
                    amount: line.Amount,
                    ...(line.Description !== undefined && { description: line.Description })
                }))
            }),
            ...(providerBill.MetaData !== undefined && {
                createdAt: providerBill.MetaData.CreateTime,
                updatedAt: providerBill.MetaData.LastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
