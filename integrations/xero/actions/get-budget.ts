import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        budgetId: z.string().describe('Xero generated unique identifier for the Budget. Example: "09944bc5-740a-4ef1-bbab-79ca6b11b1c2"')
    })
    .describe('Input parameters for retrieving a single Xero budget');

const TrackingCategorySchema = z.object({
    Name: z.string().describe('Name of the tracking category').optional(),
    Option: z.string().describe('Name of the tracking category option').optional(),
    TrackingCategoryID: z.string().describe('Xero generated unique identifier for the tracking category').optional(),
    Options: z.array(z.unknown()).describe('Tracking options for this category').optional()
});

const BudgetBalanceSchema = z.object({
    Period: z.string().describe('Period the amount applies to (e.g. "2019-08")').optional(),
    Amount: z.union([z.number(), z.string()]).describe('Budgeted amount for this period').optional(),
    UnitAmount: z.union([z.number(), z.string()]).describe('Unit amount for this period').optional(),
    Notes: z.string().describe('Optional notes for this budget balance').optional()
});

const BudgetLineSchema = z.object({
    AccountID: z.string().describe('Xero generated unique identifier for the account').optional(),
    AccountCode: z.string().describe('Customer defined alphanumeric account code (e.g. "200" or "SALES")').optional(),
    BudgetBalances: z.array(BudgetBalanceSchema).describe('Balances for each period under this budget line').optional()
});

const OutputSchema = z
    .object({
        BudgetID: z.string().describe('Xero generated identifier for a Budget (unique within organisations)'),
        Status: z.string().describe('Status of the budget').optional(),
        Description: z.string().describe('The budget description').optional(),
        Type: z.string().describe('Type of budget. OVERALL or TRACKING').optional(),
        UpdatedDateUTC: z.string().describe('The last modified date in UTC format').optional(),
        Tracking: z.array(TrackingCategorySchema).describe('Tracking categories applied to this budget').optional(),
        BudgetLines: z.array(BudgetLineSchema).describe('Budget line items with account-level period balances').optional()
    })
    .describe('A single Xero budget with line-level detail');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single budget by BudgetID from the Xero Accounting API.
 * @pitfalls: Budgets are read-only via the API (no write scope exists) and `UpdatedDateUTC` is returned in Microsoft JSON Date format (`/Date(...)/`) rather than ISO 8601.
 */
const action = createAction({
    description: 'Retrieve a single budget by BudgetID, including its line-level detail.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.budgets.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined = undefined;

        if (
            connection.connection_config &&
            typeof connection.connection_config === 'object' &&
            !Array.isArray(connection.connection_config) &&
            'tenant_id' in connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && !Array.isArray(connection.metadata)) {
            const metadataTenantId = connection.metadata['tenantId'];
            if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
                tenantId = metadataTenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionsSchema = z.array(
                z.object({
                    tenantId: z.string().optional()
                })
            );

            const connectionsResult = ConnectionsSchema.safeParse(connectionsResponse.data);

            if (!connectionsResult.success || connectionsResult.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsResult.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsResult.data[0];
            if (firstConnection?.tenantId && firstConnection.tenantId.length > 0) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/budgets
        const response = await nango.get({
            endpoint: `/api.xro/2.0/Budgets/${encodeURIComponent(input.budgetId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Budget not found',
                budgetId: input.budgetId
            });
        }

        const BudgetResponseSchema = z.object({
            Budgets: z.array(z.object({}).passthrough())
        });

        const parsedResponse = BudgetResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Xero Budgets API.'
            });
        }

        const budgets = parsedResponse.data.Budgets;

        if (budgets.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Budget not found',
                budgetId: input.budgetId
            });
        }

        const budgetObject = budgets[0];

        const parsedBudget = OutputSchema.safeParse(budgetObject);

        if (!parsedBudget.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse budget response from Xero.',
                details: parsedBudget.error.message
            });
        }

        return parsedBudget.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
