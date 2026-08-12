import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for listing budgets.');

const BalanceSchema = z.object({
    Period: z.string().optional().describe('Period the amount applies to (e.g. "2019-08").'),
    Amount: z.string().optional().describe('Budgeted amount.'),
    UnitAmount: z.string().optional().describe('Budgeted unit amount.')
});

const TrackingSchema = z.object({
    Name: z.string().optional().describe('Name of the tracking category.'),
    Option: z.string().optional().describe('Name of the option.'),
    TrackingCategoryID: z.string().optional().describe('Xero generated unique identifier for the tracking category.'),
    Options: z.array(z.unknown()).optional().describe('Tracking options.')
});

const BudgetLineSchema = z.object({
    AccountID: z.string().optional().describe('Xero generated unique identifier for the account.'),
    AccountCode: z.string().optional().describe('Customer defined alphanumeric account code.'),
    BudgetBalances: z.array(BalanceSchema).optional().describe('Period balances for the budget line.')
});

const BudgetSchema = z.object({
    BudgetID: z.string().describe('Xero generated identifier for a budget (unique within organisations).'),
    Status: z.string().describe('The status of the budget.'),
    Description: z.string().describe('The budget description.'),
    Type: z.enum(['OVERALL', 'TRACKING']).describe('Type of budget.'),
    UpdatedDateUTC: z.string().describe('The last modified date in UTC format.'),
    BudgetLines: z.array(BudgetLineSchema).describe('Budget lines. Only populated when retrieving a single budget; empty for list requests.'),
    Tracking: z.array(TrackingSchema).describe('Tracking categories assigned to the budget.')
});

const OutputSchema = z
    .object({
        budgets: z.array(BudgetSchema).describe('List of budgets retrieved from Xero.')
    })
    .describe('Output containing the list of budgets.');

const TenantSchema = z.object({
    tenantId: z.string().optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

/**
 * @tags: [read]
 * @tagReason: This action only reads budget data from Xero.
 * @pitfalls: Budget lines are omitted when listing multiple budgets; retrieve a single budget to see line items. UpdatedDateUTC is returned in Xero's /Date(timestamp+offset)/ format rather than standard ISO 8601.
 */
const action = createAction({
    description: 'List budgets from Xero.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.budgets.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResponse = await nango.getConnection();
        const connection = ConnectionSchema.parse(connectionResponse);

        let tenantId: string | undefined;

        if (
            connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId && connection.metadata && typeof connection.metadata['tenantId'] === 'string' && connection.metadata['tenantId'].length > 0) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const tenants = z.array(TenantSchema).parse(connectionsResponse.data);

            if (tenants.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (tenants.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstTenant = tenants[0];
            if (firstTenant && typeof firstTenant.tenantId === 'string' && firstTenant.tenantId.length > 0) {
                tenantId = firstTenant.tenantId;
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
            endpoint: 'api.xro/2.0/Budgets',
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            Budgets: z.array(BudgetSchema)
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            budgets: parsed.Budgets
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
