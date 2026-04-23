import { createSync } from 'nango';
import { z } from 'zod';

// API docs: https://developer.xero.com/documentation/api/accounting/organisation

const OrganisationSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    legalName: z.union([z.string(), z.null()]),
    organisationType: z.union([z.string(), z.null()]),
    baseCurrency: z.union([z.string(), z.null()]),
    countryCode: z.union([z.string(), z.null()]),
    isDemoCompany: z.union([z.boolean(), z.null()]),
    organisationStatus: z.union([z.string(), z.null()]),
    financialYearEndDay: z.union([z.number(), z.null()]),
    financialYearEndMonth: z.union([z.number(), z.null()]),
    salesTaxBasis: z.union([z.string(), z.null()]),
    salesTaxPeriod: z.union([z.string(), z.null()]),
    defaultSalesTax: z.union([z.string(), z.null()]),
    defaultPurchasesTax: z.union([z.string(), z.null()]),
    createdAt: z.union([z.string(), z.null()]),
    updatedAt: z.union([z.string(), z.null()]),
    timezone: z.union([z.string(), z.null()]),
    lineOfBusiness: z.union([z.string(), z.null()]),
    organisationEntityType: z.union([z.string(), z.null()]),
    shortCode: z.union([z.string(), z.null()]),
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
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Organisation: OrganisationSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/organisations'
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
                legalName: org.LegalName ?? null,
                organisationType: org.OrganisationType ?? null,
                baseCurrency: org.BaseCurrency ?? null,
                countryCode: org.CountryCode ?? null,
                isDemoCompany: org.IsDemoCompany ?? null,
                organisationStatus: org.OrganisationStatus ?? null,
                financialYearEndDay: org.FinancialYearEndDay ?? null,
                financialYearEndMonth: org.FinancialYearEndMonth ?? null,
                salesTaxBasis: org.SalesTaxBasis ?? null,
                salesTaxPeriod: org.SalesTaxPeriod ?? null,
                defaultSalesTax: org.DefaultSalesTax ?? null,
                defaultPurchasesTax: org.DefaultPurchasesTax ?? null,
                createdAt: org.CreatedDateUTC ?? null,
                updatedAt: org.UpdatedDateUTC ?? null,
                timezone: org.Timezone ?? null,
                lineOfBusiness: org.LineOfBusiness ?? null,
                organisationEntityType: org.OrganisationEntityType ?? null,
                shortCode: org.ShortCode ?? null,
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
