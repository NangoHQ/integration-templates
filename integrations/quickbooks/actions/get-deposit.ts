import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the deposit. Example: "123"')
});

const DepositLineSchema = z.object({
    Id: z.string().optional(),
    Amount: z.number().optional(),
    Description: z.string().optional(),
    DetailType: z.string().optional(),
    DepositLineDetail: z
        .object({
            AccountRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            Entity: z
                .object({
                    Type: z.string().optional(),
                    EntityRef: z
                        .object({
                            value: z.string(),
                            name: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional()
});

const ProviderDepositResponseSchema = z.object({
    Deposit: z.object({
        Id: z.string(),
        TotalAmt: z.number(),
        TxnDate: z.string(),
        PrivateNote: z.string().optional(),
        DepositToAccountRef: z
            .object({
                value: z.string(),
                name: z.string().optional()
            })
            .optional(),
        Line: z.array(DepositLineSchema).optional(),
        MetaData: z
            .object({
                CreateTime: z.string(),
                LastUpdatedTime: z.string()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    totalAmount: z.number(),
    transactionDate: z.string(),
    privateNote: z.string().optional(),
    depositToAccountId: z.string().optional(),
    depositToAccountName: z.string().optional(),
    lines: z
        .array(
            z.object({
                id: z.string().optional(),
                amount: z.number().optional(),
                description: z.string().optional(),
                detailType: z.string().optional(),
                accountId: z.string().optional(),
                accountName: z.string().optional()
            })
        )
        .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

async function getCompany(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (typeof realmId !== 'string' || !realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const action = createAction({
    description: 'Retrieve a deposit by ID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-deposit',
        group: 'Deposits'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/deposit
        const response = await nango.get({
            endpoint: `/v3/company/${realmId}/deposit/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Deposit with ID '${input.id}' was not found.`,
                id: input.id
            });
        }

        const responseData = ProviderDepositResponseSchema.parse(response.data);
        const deposit = responseData.Deposit;

        const mappedLines =
            deposit.Line?.map((line) => {
                return {
                    id: line.Id,
                    amount: line.Amount,
                    description: line.Description,
                    detailType: line.DetailType,
                    accountId: line.DepositLineDetail?.AccountRef?.value,
                    accountName: line.DepositLineDetail?.AccountRef?.name
                };
            }) ?? [];

        return {
            id: deposit.Id,
            totalAmount: deposit.TotalAmt,
            transactionDate: deposit.TxnDate,
            privateNote: deposit.PrivateNote,
            depositToAccountId: deposit.DepositToAccountRef?.value,
            depositToAccountName: deposit.DepositToAccountRef?.name,
            lines: mappedLines.length > 0 ? mappedLines : undefined,
            createdAt: deposit.MetaData?.CreateTime,
            updatedAt: deposit.MetaData?.LastUpdatedTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
