import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        date: z.string().optional().describe('Report date in YYYY-MM-DD format. Omit to use the current date.')
    })
    .describe('Input for retrieving the Executive Summary report.');

const ReportAttributeSchema = z.object({
    Value: z.string().describe('Attribute value, typically an entity ID or code.'),
    Id: z.string().describe('Attribute identifier, e.g. "account".')
});

const ReportCellSchema = z.object({
    Value: z.string().optional().describe('Cell text value.'),
    Attributes: z.array(ReportAttributeSchema).optional().describe('Optional attributes providing extra metadata for the cell.')
});

const ReportRowSchema = z.object({
    RowType: z.string().describe('Type of row, e.g. Header, Section, Row, SummaryRow.'),
    Title: z.string().optional().describe('Section title, present when RowType is Section.'),
    Cells: z.array(ReportCellSchema).optional().describe('Cells in this row.'),
    get Rows() {
        return z.array(ReportRowSchema).optional().describe('Nested rows, present for sections.');
    }
});

const ReportFieldSchema = z.object({
    FieldID: z.string().optional().describe('Field identifier.'),
    Value: z.string().optional().describe('Field value.')
});

const OutputSchema = z
    .object({
        ReportID: z.string().describe('Unique identifier for the report type, e.g. "ExecutiveSummary".'),
        ReportName: z.string().describe('Human-readable report name.'),
        ReportType: z.string().describe('Report type code.'),
        ReportTitles: z.array(z.string()).describe('Array of report title strings.'),
        ReportDate: z.string().describe('Date the report was generated.'),
        UpdatedDateUTC: z.string().describe('UTC timestamp of the last report update.'),
        Fields: z.array(ReportFieldSchema).describe('Report filter fields.'),
        Rows: z.array(ReportRowSchema).describe('Nested rows that contain the report data.')
    })
    .describe('Executive Summary report output.');

const ApiResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    ProviderName: z.string(),
    DateTimeUTC: z.string(),
    Reports: z.array(OutputSchema)
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a read-only Executive Summary report from Xero.
 * @pitfalls: UpdatedDateUTC is returned in Microsoft JSON Date format (/Date(timestamp)/) rather than ISO 8601, so standard Date.parse may fail.
 */
const action = createAction({
    description: "Get the organisation's Executive Summary report (high-level KPIs).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.executivesummary.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/reports#executive-summary
            endpoint: 'api.xro/2.0/Reports/ExecutiveSummary',
            params: {
                ...(input.date !== undefined && { date: input.date })
            },
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const apiResponse = ApiResponseSchema.parse(response.data);
        const [report] = apiResponse.Reports;
        if (!report) {
            throw new nango.ActionError({
                type: 'empty_report',
                message: 'The Executive Summary report returned no data.'
            });
        }

        return report;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    const configTenant = connection.connection_config?.['tenant_id'];
    if (typeof configTenant === 'string' && configTenant.length > 0) {
        return configTenant;
    }

    const metaTenant = connection.metadata?.['tenantId'];
    if (typeof metaTenant === 'string' && metaTenant.length > 0) {
        return metaTenant;
    }

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

    const first = z.object({ tenantId: z.string() }).safeParse(connectionsData[0]);
    if (first.success && first.data.tenantId.length > 0) {
        return first.data.tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}
