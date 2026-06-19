import { z } from 'zod';
import { createAction, NangoAction } from 'nango';

const InputSchema = z.object({
    CustomerRef: z.object({
        value: z.string().describe('The ID of the customer for this estimate. Example: "123"')
    }),
    TxnDate: z.string().describe('The date of the transaction in YYYY-MM-DD format. Example: "2024-01-15"'),
    Line: z
        .array(
            z.object({
                Amount: z.number().describe('The monetary amount of this line item. Example: 100.00'),
                Description: z.string().optional().describe('Description of the line item'),
                DetailType: z.enum(['SalesItemLineDetail', 'DescriptionOnly']).describe('The type of line detail'),
                SalesItemLineDetail: z
                    .object({
                        ItemRef: z.object({
                            value: z.string().describe('The ID of the item. Example: "1"')
                        }),
                        Qty: z.number().optional().describe('Quantity of the item'),
                        UnitPrice: z.number().optional().describe('Unit price of the item')
                    })
                    .optional()
            })
        )
        .describe('The line items for this estimate'),
    PrivateNote: z.string().optional().describe('Private note for the estimate'),
    BillEmail: z
        .object({
            Address: z.string().describe('Email address to send the estimate')
        })
        .optional()
});

const OutputSchema = z.object({
    Id: z.string().describe('The unique identifier of the created estimate'),
    SyncToken: z.string().describe('The sync token for concurrency control'),
    DocNumber: z.string().optional().describe('The document number of the estimate'),
    TxnDate: z.string().describe('The transaction date of the estimate'),
    TotalAmt: z.number().describe('The total amount of the estimate'),
    CustomerRef: z.object({
        value: z.string().describe('The ID of the customer'),
        name: z.string().optional().describe('The name of the customer')
    }),
    Line: z.array(
        z.object({
            Id: z.string().optional().describe('The ID of the line item'),
            LineNum: z.number().optional().describe('The line number'),
            Amount: z.number().describe('The amount of the line item'),
            Description: z.string().optional().describe('Description of the line item'),
            DetailType: z.string().describe('The type of line detail'),
            SalesItemLineDetail: z
                .object({
                    ItemRef: z.object({
                        value: z.string().describe('The ID of the item'),
                        name: z.string().optional().describe('The name of the item')
                    }),
                    Qty: z.number().optional().describe('Quantity of the item'),
                    UnitPrice: z.number().optional().describe('Unit price of the item')
                })
                .optional()
        })
    ),
    MetaData: z.object({
        CreateTime: z.string().describe('The creation timestamp'),
        LastUpdatedTime: z.string().describe('The last updated timestamp')
    })
});

async function getRealmId(nango: NangoAction): Promise<string> {
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
    description: 'Create an estimate for a customer in QuickBooks Online.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input) => {
        const realmId = await getRealmId(nango);

        const config = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/estimate#create-an-estimate
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/estimate`,
            data: input,
            retries: 3,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create estimate. The API returned an empty response.'
            });
        }

        const estimate = response.data.Estimate;
        if (!estimate) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create estimate. The API response did not contain an Estimate object.'
            });
        }

        return OutputSchema.parse(estimate);
    }
});

export default action;
