import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the estimate to retrieve. Example: "123"')
});

const ProviderEstimateSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .passthrough()
        .optional(),
    DocNumber: z.string().optional(),
    TxnDate: z.string().optional(),
    PrivateNote: z.string().optional(),
    TotalAmt: z.number().optional(),
    BillEmail: z
        .object({
            Address: z.string().optional()
        })
        .passthrough()
        .optional(),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .passthrough()
        .optional(),
    Line: z
        .array(
            z
                .object({
                    Id: z.string().optional(),
                    LineNum: z.union([z.string(), z.number()]).optional(),
                    Description: z.string().optional(),
                    Amount: z.number().optional(),
                    DetailType: z.string().optional()
                })
                .passthrough()
        )
        .optional()
});

const ProviderResponseSchema = z
    .object({
        Estimate: ProviderEstimateSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    syncToken: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    docNumber: z.string().optional(),
    txnDate: z.string().optional(),
    privateNote: z.string().optional(),
    totalAmount: z.number().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    lines: z
        .array(
            z.object({
                id: z.string().optional(),
                lineNumber: z.string().optional(),
                description: z.string().optional(),
                amount: z.number().optional(),
                detailType: z.string().optional()
            })
        )
        .optional()
});

function mapProviderToOutput(providerData: z.infer<typeof ProviderEstimateSchema>): z.infer<typeof OutputSchema> {
    return {
        id: providerData.Id,
        syncToken: providerData.SyncToken,
        ...(providerData.MetaData?.CreateTime && { createdAt: providerData.MetaData.CreateTime }),
        ...(providerData.MetaData?.LastUpdatedTime && { updatedAt: providerData.MetaData.LastUpdatedTime }),
        ...(providerData.DocNumber && { docNumber: providerData.DocNumber }),
        ...(providerData.TxnDate && { txnDate: providerData.TxnDate }),
        ...(providerData.PrivateNote && { privateNote: providerData.PrivateNote }),
        ...(providerData.TotalAmt !== undefined && { totalAmount: providerData.TotalAmt }),
        ...(providerData.CustomerRef?.value && { customerId: providerData.CustomerRef.value }),
        ...(providerData.CustomerRef?.name && { customerName: providerData.CustomerRef.name }),
        ...(providerData.Line && {
            lines: providerData.Line.map((line) => ({
                ...(line.Id && { id: line.Id }),
                ...(line.LineNum !== undefined && { lineNumber: String(line.LineNum) }),
                ...(line.Description && { description: line.Description }),
                ...(line.Amount !== undefined && { amount: line.Amount }),
                ...(line.DetailType && { detailType: line.DetailType })
            }))
        })
    };
}

const action = createAction({
    description: 'Retrieve an estimate by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/estimate#read-an-estimate
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/estimate/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Estimate not found',
                id: input.id
            });
        }

        const responseData = ProviderResponseSchema.parse(response.data);
        const providerData = responseData.Estimate;

        if (!providerData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Estimate not found',
                id: input.id
            });
        }

        return mapProviderToOutput(providerData);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
