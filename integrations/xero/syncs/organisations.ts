import { createSync } from 'nango';
import { z } from 'zod';

const OrganisationSchema = z.object({
    id: z.string(),
    Name: z.string().optional(),
    LegalName: z.string().optional(),
    ShortCode: z.string().optional(),
    LineOfBusiness: z.string().optional(),
    BaseCurrency: z.string().optional(),
    CountryCode: z.string().optional(),
    IsDemoCompany: z.boolean().optional(),
    OrganisationStatus: z.string().optional(),
    TaxNumber: z.string().optional(),
    FinancialYearEndDay: z.number().optional(),
    FinancialYearEndMonth: z.number().optional(),
    DefaultSalesTax: z.string().optional(),
    DefaultPurchasesTax: z.string().optional(),
    PeriodLockDate: z.string().optional(),
    CreatedDateUTC: z.string().optional(),
    UpdatedDateUTC: z.string().optional()
});

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
            path: '/syncs/organisations'
        }
    ],

    exec: async (nango) => {
        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        // https://developer.xero.com/documentation/api/accounting/organisation
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Organisation',
            headers,
            retries: 3
        });

        if (typeof response.data !== 'object' || response.data === null) {
            return;
        }

        const apiResponse = z
            .object({
                Organisations: z
                    .array(
                        z.object({
                            OrganisationID: z.string(),
                            Name: z.string().optional(),
                            LegalName: z.string().optional(),
                            ShortCode: z.string().optional(),
                            LineOfBusiness: z.string().optional(),
                            BaseCurrency: z.string().optional(),
                            CountryCode: z.string().optional(),
                            IsDemoCompany: z.boolean().optional(),
                            OrganisationStatus: z.string().optional(),
                            TaxNumber: z.string().optional(),
                            FinancialYearEndDay: z.number().optional(),
                            FinancialYearEndMonth: z.number().optional(),
                            DefaultSalesTax: z.string().optional(),
                            DefaultPurchasesTax: z.string().optional(),
                            PeriodLockDate: z.string().optional(),
                            CreatedDateUTC: z.string().optional(),
                            UpdatedDateUTC: z.string().optional()
                        })
                    )
                    .optional()
            })
            .safeParse(response.data);

        if (!apiResponse.success || !apiResponse.data.Organisations || apiResponse.data.Organisations.length === 0) {
            return;
        }

        const organisations = apiResponse.data.Organisations.map((org) => ({
            id: org.OrganisationID,
            ...(org.Name !== undefined && { Name: org.Name }),
            ...(org.LegalName !== undefined && { LegalName: org.LegalName }),
            ...(org.ShortCode !== undefined && { ShortCode: org.ShortCode }),
            ...(org.LineOfBusiness !== undefined && { LineOfBusiness: org.LineOfBusiness }),
            ...(org.BaseCurrency !== undefined && { BaseCurrency: org.BaseCurrency }),
            ...(org.CountryCode !== undefined && { CountryCode: org.CountryCode }),
            ...(org.IsDemoCompany !== undefined && { IsDemoCompany: org.IsDemoCompany }),
            ...(org.OrganisationStatus !== undefined && { OrganisationStatus: org.OrganisationStatus }),
            ...(org.TaxNumber !== undefined && { TaxNumber: org.TaxNumber }),
            ...(org.FinancialYearEndDay !== undefined && { FinancialYearEndDay: org.FinancialYearEndDay }),
            ...(org.FinancialYearEndMonth !== undefined && { FinancialYearEndMonth: org.FinancialYearEndMonth }),
            ...(org.DefaultSalesTax !== undefined && { DefaultSalesTax: org.DefaultSalesTax }),
            ...(org.DefaultPurchasesTax !== undefined && { DefaultPurchasesTax: org.DefaultPurchasesTax }),
            ...(org.PeriodLockDate !== undefined && { PeriodLockDate: org.PeriodLockDate }),
            ...(org.CreatedDateUTC !== undefined && { CreatedDateUTC: org.CreatedDateUTC }),
            ...(org.UpdatedDateUTC !== undefined && { UpdatedDateUTC: org.UpdatedDateUTC })
        }));

        if (organisations.length === 0) {
            return;
        }

        await nango.batchSave(organisations, 'Organisation');
    }
});

async function resolveTenantId(nango: Parameters<(typeof sync)['exec']>[0]): Promise<string> {
    const connectionSchema = z.object({
        connection_config: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
    });

    const rawConnection = await nango.getConnection();
    const connection = connectionSchema.parse(rawConnection);

    if (connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string' && connection.connection_config['tenant_id'].length > 0) {
        return connection.connection_config['tenant_id'];
    }

    if (connection.metadata && typeof connection.metadata['tenantId'] === 'string' && connection.metadata['tenantId'].length > 0) {
        return connection.metadata['tenantId'];
    }

    // https://developer.xero.com/documentation/api/accounting/connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    if (!Array.isArray(connectionsResponse.data)) {
        throw new Error('Invalid response from Xero connections endpoint.');
    }

    if (connectionsResponse.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }

    if (connectionsResponse.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const tenantSchema = z.object({
        tenantId: z.string()
    });

    const first = tenantSchema.parse(connectionsResponse.data[0]);
    return first.tenantId;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
