import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('The unique identifier of the estimate to update. Example: "123"'),
    SyncToken: z.string().describe('The current SyncToken for optimistic concurrency control. Example: "0"'),
    sparse: z.boolean().optional().describe('When true, only provided fields are updated (sparse update).'),
    TotalAmt: z.number().optional().describe('Total amount of the estimate.'),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                Description: z.string().optional(),
                Amount: z.number().optional(),
                DetailType: z.string().optional(),
                SalesItemLineDetail: z
                    .object({
                        ItemRef: z
                            .object({
                                value: z.string(),
                                name: z.string().optional()
                            })
                            .optional(),
                        Qty: z.number().optional(),
                        UnitPrice: z.number().optional()
                    })
                    .optional()
            })
        )
        .optional()
        .describe('Line items for the estimate.'),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Reference to the customer.'),
    BillEmail: z
        .object({
            Address: z.string().optional()
        })
        .optional()
        .describe('Billing email address.'),
    ShipFromAddr: z
        .object({
            Line1: z.string().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional(),
            Country: z.string().optional()
        })
        .optional()
        .describe('Shipping from address.'),
    BillAddr: z
        .object({
            Line1: z.string().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional(),
            Country: z.string().optional()
        })
        .optional()
        .describe('Billing address.'),
    ShipAddr: z
        .object({
            Line1: z.string().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional(),
            Country: z.string().optional()
        })
        .optional()
        .describe('Shipping address.'),
    TxnDate: z.string().optional().describe('Transaction date in YYYY-MM-DD format.'),
    ExpirationDate: z.string().optional().describe('Expiration date in YYYY-MM-DD format.'),
    PrivateNote: z.string().optional().describe('Private note not visible to customer.'),
    CustomerMemo: z
        .object({
            value: z.string().optional()
        })
        .optional()
        .describe('Customer-facing memo.'),
    SalesTermRef: z
        .object({
            value: z.string().optional()
        })
        .optional()
        .describe('Reference to sales term.')
});

const EstimateResponseSchema = z.object({
    Estimate: z.object({
        Id: z.string(),
        SyncToken: z.string(),
        MetaData: z
            .object({
                CreateTime: z.string(),
                LastUpdatedTime: z.string()
            })
            .optional(),
        TotalAmt: z.number().optional(),
        Line: z.array(z.object({}).passthrough()).optional(),
        CustomerRef: z.object({}).passthrough().optional(),
        TxnDate: z.string().optional(),
        ExpirationDate: z.string().optional(),
        PrivateNote: z.string().optional(),
        status: z.string().optional()
    })
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the updated estimate.'),
    syncToken: z.string().describe('The new SyncToken after update.'),
    totalAmount: z.number().optional().describe('Total amount of the estimate.'),
    transactionDate: z.string().optional().describe('Transaction date.'),
    status: z.string().optional().describe('Status of the estimate.'),
    success: z.boolean().describe('Whether the update was successful.')
});

const action = createAction({
    description: 'Update an existing estimate in QuickBooks with sparse update support.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config || {};
        const realmId = connectionConfig['realmId'];

        if (!realmId || typeof realmId !== 'string') {
            throw new nango.ActionError({
                type: 'configuration_error',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId.'
            });
        }

        const updatePayload: Record<string, unknown> = {
            Id: input.Id,
            SyncToken: input.SyncToken
        };

        if (input.sparse !== undefined) {
            updatePayload['sparse'] = input.sparse;
        }

        if (input.TotalAmt !== undefined) {
            updatePayload['TotalAmt'] = input.TotalAmt;
        }

        if (input.Line !== undefined) {
            updatePayload['Line'] = input.Line;
        }

        if (input.CustomerRef !== undefined) {
            updatePayload['CustomerRef'] = input.CustomerRef;
        }

        if (input.BillEmail !== undefined) {
            updatePayload['BillEmail'] = input.BillEmail;
        }

        if (input.ShipFromAddr !== undefined) {
            updatePayload['ShipFromAddr'] = input.ShipFromAddr;
        }

        if (input.BillAddr !== undefined) {
            updatePayload['BillAddr'] = input.BillAddr;
        }

        if (input.ShipAddr !== undefined) {
            updatePayload['ShipAddr'] = input.ShipAddr;
        }

        if (input.TxnDate !== undefined) {
            updatePayload['TxnDate'] = input.TxnDate;
        }

        if (input.ExpirationDate !== undefined) {
            updatePayload['ExpirationDate'] = input.ExpirationDate;
        }

        if (input.PrivateNote !== undefined) {
            updatePayload['PrivateNote'] = input.PrivateNote;
        }

        if (input.CustomerMemo !== undefined) {
            updatePayload['CustomerMemo'] = input.CustomerMemo;
        }

        if (input.SalesTermRef !== undefined) {
            updatePayload['SalesTermRef'] = input.SalesTermRef;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/estimate#update-an-estimate
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/estimate`,
            data: updatePayload,
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Empty response from QuickBooks API'
            });
        }

        const parsed = EstimateResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Invalid response format from QuickBooks API',
                details: parsed.error.message
            });
        }

        const estimate = parsed.data.Estimate;

        return {
            id: estimate.Id,
            syncToken: estimate.SyncToken,
            ...(estimate.TotalAmt !== undefined && { totalAmount: estimate.TotalAmt }),
            ...(estimate.TxnDate !== undefined && { transactionDate: estimate.TxnDate }),
            ...(estimate.status !== undefined && { status: estimate.status }),
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
