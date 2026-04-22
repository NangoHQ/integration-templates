import { createSync } from 'nango';
import { z } from 'zod';

// API docs: https://developer.xero.com/documentation/api/accounting/organisation

const OrganisationSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    legal_name: z.union([z.string(), z.null()]),
    organisation_type: z.union([z.string(), z.null()]),
    base_currency: z.union([z.string(), z.null()]),
    country_code: z.union([z.string(), z.null()]),
    is_demo_company: z.union([z.boolean(), z.null()]),
    organisation_status: z.union([z.string(), z.null()]),
    financial_year_end_day: z.union([z.number(), z.null()]),
    financial_year_end_month: z.union([z.number(), z.null()]),
    sales_tax_basis: z.union([z.string(), z.null()]),
    sales_tax_period: z.union([z.string(), z.null()]),
    default_sales_tax: z.union([z.string(), z.null()]),
    default_purchases_tax: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    timezone: z.union([z.string(), z.null()]),
    line_of_business: z.union([z.string(), z.null()]),
    organisation_entity_type: z.union([z.string(), z.null()]),
    short_code: z.union([z.string(), z.null()]),
    class: z.union([z.string(), z.null()]),
    edition: z.union([z.string(), z.null()])
});

const ConnectionResponseSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    tenantName: z.string().optional()
});

const ConnectionsApiResponseSchema = z.object({
    data: z.array(ConnectionResponseSchema)
});

const OrganisationApiResponseSchema = z.object({
    Organisations: z
        .array(
            z.object({
                OrganisationID: z.string(),
                Name: z.union([z.string(), z.null()]).optional(),
                LegalName: z.union([z.string(), z.null()]).optional(),
                OrganisationType: z.union([z.string(), z.null()]).optional(),
                BaseCurrency: z.union([z.string(), z.null()]).optional(),
                CountryCode: z.union([z.string(), z.null()]).optional(),
                IsDemoCompany: z.boolean().optional(),
                OrganisationStatus: z.union([z.string(), z.null()]).optional(),
                FinancialYearEndDay: z.union([z.number(), z.null()]).optional(),
                FinancialYearEndMonth: z.union([z.number(), z.null()]).optional(),
                SalesTaxBasis: z.union([z.string(), z.null()]).optional(),
                SalesTaxPeriod: z.union([z.string(), z.null()]).optional(),
                DefaultSalesTax: z.union([z.string(), z.null()]).optional(),
                DefaultPurchasesTax: z.union([z.string(), z.null()]).optional(),
                CreatedDateUTC: z.union([z.string(), z.null()]).optional(),
                UpdatedDateUTC: z.union([z.string(), z.null()]).optional(),
                Timezone: z.union([z.string(), z.null()]).optional(),
                LineOfBusiness: z.union([z.string(), z.null()]).optional(),
                OrganisationEntityType: z.union([z.string(), z.null()]).optional(),
                ShortCode: z.union([z.string(), z.null()]).optional(),
                Class: z.union([z.string(), z.null()]).optional(),
                Edition: z.union([z.string(), z.null()]).optional()
            })
        )
        .min(1)
});

async function resolveTenantId(nango: {
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
    getConnection: () => Promise<{ connection_config?: Record<string, unknown>; metadata?: Record<string, unknown> | null }>;
}): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfig = connection.connection_config;
    if (connectionConfig && typeof connectionConfig['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
        return connectionConfig['tenant_id'];
    }

    const metadata = connection.metadata;
    if (metadata && typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
        return metadata['tenantId'];
    }

    // https://developer.xero.com/documentation/api/accounting/connections
    const connections = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsedConnections = ConnectionsApiResponseSchema.parse(connections.data);

    if (parsedConnections.data.length === 0) {
        throw new Error('No tenants found. Please connect a Xero organisation.');
    }

    if (parsedConnections.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstConnection = parsedConnections.data[0];
    if (firstConnection && typeof firstConnection.tenantId === 'string') {
        return firstConnection.tenantId;
    }

    throw new Error('Unable to resolve tenant ID from connections response.');
}

const sync = createSync({
    description: 'Sync Xero organisation records for connected tenants.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Organisation: OrganisationSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/sync-organisations'
        }
    ],

    exec: async (nango) => {
        const tenantId = await resolveTenantId(nango);

        await nango.trackDeletesStart('Organisation');

        // https://developer.xero.com/documentation/api/accounting/organisation
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Organisation',
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsedResponse = OrganisationApiResponseSchema.parse(response.data);
        const org = parsedResponse.Organisations[0];

        if (org !== undefined) {
            const organisation = {
                id: org.OrganisationID,
                name: org.Name ?? null,
                legal_name: org.LegalName ?? null,
                organisation_type: org.OrganisationType ?? null,
                base_currency: org.BaseCurrency ?? null,
                country_code: org.CountryCode ?? null,
                is_demo_company: org.IsDemoCompany ?? null,
                organisation_status: org.OrganisationStatus ?? null,
                financial_year_end_day: org.FinancialYearEndDay ?? null,
                financial_year_end_month: org.FinancialYearEndMonth ?? null,
                sales_tax_basis: org.SalesTaxBasis ?? null,
                sales_tax_period: org.SalesTaxPeriod ?? null,
                default_sales_tax: org.DefaultSalesTax ?? null,
                default_purchases_tax: org.DefaultPurchasesTax ?? null,
                created_at: org.CreatedDateUTC ?? null,
                updated_at: org.UpdatedDateUTC ?? null,
                timezone: org.Timezone ?? null,
                line_of_business: org.LineOfBusiness ?? null,
                organisation_entity_type: org.OrganisationEntityType ?? null,
                short_code: org.ShortCode ?? null,
                class: org.Class ?? null,
                edition: org.Edition ?? null
            };

            await nango.batchSave([organisation], 'Organisation');
        }

        await nango.trackDeletesEnd('Organisation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
