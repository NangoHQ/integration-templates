import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const ProviderOrganisationSchema = z.object({
    OrganisationID: z.string(),
    Name: z.string(),
    LegalName: z.string().nullish(),
    BaseCurrency: z.string().nullish(),
    CountryCode: z.string().nullish(),
    IsDemoCompany: z.boolean().nullish(),
    OrganisationStatus: z.string().nullish(),
    Class: z.string().nullish(),
    Edition: z.string().nullish(),
    FinancialYearEndDay: z.number().nullish(),
    FinancialYearEndMonth: z.number().nullish()
});

const OutputOrganisationSchema = z.object({
    OrganisationID: z.string().describe('Unique identifier for the organisation. Example: "27e853de-cfdc-4bf3-85e9-3979ee2bcaba"'),
    Name: z.string().describe('Display name of the organisation.'),
    LegalName: z.string().optional().describe('Legal name of the organisation.'),
    BaseCurrency: z.string().optional().describe('Base currency code. Example: "USD"'),
    CountryCode: z.string().optional().describe('ISO country code. Example: "US"'),
    IsDemoCompany: z.boolean().optional().describe('Whether this is a demo company.'),
    OrganisationStatus: z.string().optional().describe('Status of the organisation.'),
    Class: z.string().optional().describe('Organisation class. Examples: "DEMO", "TRIAL", "PAID".'),
    Edition: z.string().optional().describe('Xero edition or plan.'),
    FinancialYearEndDay: z.number().optional().describe('Day of the month the financial year ends.'),
    FinancialYearEndMonth: z.number().optional().describe('Month the financial year ends (1-12).')
});

const OutputSchema = z
    .object({
        organisation: OutputOrganisationSchema.describe('The connected Xero organisation.')
    })
    .describe('Details of the connected Xero organisation.');

/**
 * @tags: [read]
 * @tagReason: This action performs a single read-only provider request to retrieve organisation details.
 * @pitfalls: Multi-tenant connections without a preselected tenant identifier in connection_config or metadata will throw an error instead of returning data.
 */
const action = createAction({
    description: 'Get details of the connected Xero organisation (name, currency, financial year end, edition, demo/trial status).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection && typeof connection === 'object' && 'connection_config' in connection) {
            const config = connection.connection_config;
            if (config && typeof config === 'object' && 'tenant_id' in config && typeof config['tenant_id'] === 'string' && config['tenant_id'].length > 0) {
                tenantId = config['tenant_id'];
            }
        }

        if (!tenantId && connection && typeof connection === 'object' && 'metadata' in connection) {
            const metadata = connection.metadata;
            if (
                metadata &&
                typeof metadata === 'object' &&
                'tenantId' in metadata &&
                typeof metadata['tenantId'] === 'string' &&
                metadata['tenantId'].length > 0
            ) {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = connectionsData[0];
            if (first && typeof first === 'object' && 'tenantId' in first && typeof first.tenantId === 'string' && first.tenantId.length > 0) {
                tenantId = first.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Organisation',
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object' || !('Organisations' in data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from Xero Organisation endpoint.'
            });
        }

        const orgs = data.Organisations;
        if (!Array.isArray(orgs) || orgs.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No organisation found for the connected tenant.'
            });
        }

        const org = orgs[0];
        if (!org || typeof org !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected organisation format in response.'
            });
        }

        const providerOrg = ProviderOrganisationSchema.parse(org);

        return {
            organisation: {
                OrganisationID: providerOrg.OrganisationID,
                Name: providerOrg.Name,
                ...(providerOrg.LegalName != null && { LegalName: providerOrg.LegalName }),
                ...(providerOrg.BaseCurrency != null && { BaseCurrency: providerOrg.BaseCurrency }),
                ...(providerOrg.CountryCode != null && { CountryCode: providerOrg.CountryCode }),
                ...(providerOrg.IsDemoCompany != null && { IsDemoCompany: providerOrg.IsDemoCompany }),
                ...(providerOrg.OrganisationStatus != null && { OrganisationStatus: providerOrg.OrganisationStatus }),
                ...(providerOrg.Class != null && { Class: providerOrg.Class }),
                ...(providerOrg.Edition != null && { Edition: providerOrg.Edition }),
                ...(providerOrg.FinancialYearEndDay != null && { FinancialYearEndDay: providerOrg.FinancialYearEndDay }),
                ...(providerOrg.FinancialYearEndMonth != null && { FinancialYearEndMonth: providerOrg.FinancialYearEndMonth })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
