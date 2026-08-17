import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for this action.');

const ReportSchema = z
    .object({
        ReportID: z.string().describe('Unique identifier for the report. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"'),
        ReportName: z.string().describe('Name of the report.'),
        ReportType: z.string().describe('Type classification of the report.'),
        ReportTitles: z.array(z.string()).describe('Titles associated with the report.'),
        UpdatedDateUTC: z.string().describe('Last modified timestamp in UTC.')
    })
    .describe('A single ad-hoc report entry from the Xero Accounting API.');

const OutputSchema = z
    .object({
        Reports: z.array(ReportSchema).describe('List of ad-hoc reports available for the organisation.')
    })
    .describe('Response containing the list of ad-hoc reports for the organisation.');

const ProviderReportSchema = z.object({
    ReportID: z.string(),
    ReportName: z.string(),
    ReportType: z.string(),
    ReportTitles: z.array(z.string()).optional(),
    UpdatedDateUTC: z.string()
});

const ProviderResponseSchema = z.object({
    Reports: z.array(ProviderReportSchema).optional()
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfig = z.object({ tenant_id: z.string().optional() }).safeParse(connection['connection_config']);
    if (connectionConfig.success && connectionConfig.data.tenant_id) {
        return connectionConfig.data.tenant_id;
    }

    const metadata = z.object({ tenantId: z.string().optional() }).safeParse(connection['metadata']);
    if (metadata.success && metadata.data.tenantId) {
        return metadata.data.tenantId;
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const rawConnections = response.data;
    if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    if (rawConnections.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = z.object({ tenantId: z.string() }).safeParse(rawConnections[0]);
    if (firstConnection.success && firstConnection.data.tenantId.length > 0) {
        return firstConnection.data.tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}

/**
 * @tags: [read]
 * @tagReason: Reads the organisation's ad-hoc reports from the Xero Accounting API.
 * @pitfalls: An empty Reports array is expected when the organisation has never generated an ad-hoc report.
 */
const action = createAction({
    description: "List the organisation's ad-hoc/on-demand reports that require a UUID to fetch (e.g. certain tax/GST reports).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.taxreports.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Reports',
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            Reports:
                parsed.Reports?.map((report) => ({
                    ReportID: report.ReportID,
                    ReportName: report.ReportName,
                    ReportType: report.ReportType,
                    ReportTitles: report.ReportTitles ?? [],
                    UpdatedDateUTC: report.UpdatedDateUTC
                })) ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
