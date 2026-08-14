import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTrackingSchema = z.object({
    TrackingCategoryID: z.string().optional(),
    Name: z.string().optional(),
    TrackingOptionID: z.string().optional(),
    Option: z.string().optional()
});

const ProviderBudgetSchema = z.object({
    BudgetID: z.string(),
    Type: z.string().optional(),
    Description: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    Tracking: z.array(ProviderTrackingSchema).optional(),
    BudgetLines: z.array(z.unknown()).optional()
});

const ProviderBudgetsResponseSchema = z.object({
    Budgets: z.array(ProviderBudgetSchema)
});

const BudgetTrackingSchema = z
    .object({
        TrackingCategoryID: z.string().optional().describe('Xero generated unique identifier for the tracking category.'),
        Name: z.string().optional().describe('Name of the tracking category.'),
        TrackingOptionID: z.string().optional().describe('Xero generated unique identifier for the tracking option.'),
        Option: z.string().optional().describe('Name of the tracking option.')
    })
    .describe('A tracking category applied to the budget.');

const BudgetSchema = z
    .object({
        id: z.string().describe('Xero generated unique identifier for the budget.'),
        Type: z.string().describe('Type of budget. OVERALL or TRACKING.'),
        Description: z.string().optional().describe('The budget description.'),
        UpdatedDateUTC: z.string().describe('The last modified date in UTC format.'),
        Tracking: z.array(BudgetTrackingSchema).optional().describe('Tracking categories applied to the budget.')
    })
    .describe('A Xero budget record.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish()
});

const ConnectionItemSchema = z.object({
    tenantId: z.string()
});

const sync = createSync({
    description: 'Sync budgets from Xero.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Budget: BudgetSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.safeParse(connection);
        let tenantId: string | undefined;

        if (parsedConnection.success) {
            const config = parsedConnection.data.connection_config;
            if (config) {
                const value = config['tenant_id'];
                if (typeof value === 'string' && value.length > 0) {
                    tenantId = value;
                }
            }

            if (!tenantId) {
                const metadata = parsedConnection.data.metadata;
                if (metadata) {
                    const value = metadata['tenantId'];
                    if (typeof value === 'string' && value.length > 0) {
                        tenantId = value;
                    }
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = z.array(ConnectionItemSchema).safeParse(connectionsResponse.data);

            if (!parsedConnections.success || parsedConnections.data.length === 0) {
                throw new Error('No Xero tenants found for this connection.');
            }

            if (parsedConnections.data.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const first = parsedConnections.data[0];
            if (first && first.tenantId.length > 0) {
                tenantId = first.tenantId;
            }
        }

        if (!tenantId) {
            throw new Error('Unable to resolve xero-tenant-id.');
        }

        await nango.trackDeletesStart('Budget');

        // https://developer.xero.com/documentation/api/accounting/budgets
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Budgets',
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = ProviderBudgetsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse budgets response: ${parsed.error.message}`);
        }

        const budgets = parsed.data.Budgets ?? [];

        const mapped = budgets.map((budget) => ({
            id: budget.BudgetID,
            ...(budget.Type != null && { Type: budget.Type }),
            ...(budget.Description != null && { Description: budget.Description }),
            ...(budget.UpdatedDateUTC != null && { UpdatedDateUTC: budget.UpdatedDateUTC }),
            ...(budget.Tracking != null &&
                budget.Tracking.length > 0 && {
                    Tracking: budget.Tracking.map((t) => ({
                        ...(t.TrackingCategoryID != null && { TrackingCategoryID: t.TrackingCategoryID }),
                        ...(t.Name != null && { Name: t.Name }),
                        ...(t.TrackingOptionID != null && { TrackingOptionID: t.TrackingOptionID }),
                        ...(t.Option != null && { Option: t.Option })
                    }))
                })
        }));

        if (mapped.length > 0) {
            await nango.batchSave(mapped, 'Budget');
        }

        await nango.trackDeletesEnd('Budget');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
