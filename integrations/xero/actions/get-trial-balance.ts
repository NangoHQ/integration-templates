import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        date: z.string().optional().describe('As-at date for the trial balance in YYYY-MM-DD format. Omit for the current month.'),
        paymentsOnly: z.boolean().optional().describe('When true, returns cash-basis transactions only.')
    })
    .describe('Input for retrieving the Trial Balance report.');

const ReportAttributeSchema = z.object({
    Id: z.string().optional().describe('Attribute identifier.'),
    Value: z.string().optional().describe('Attribute value.')
});

const ReportCellSchema = z.object({
    Value: z.string().optional().describe('Cell value.'),
    Attributes: z.array(ReportAttributeSchema).optional().describe('Attributes associated with the cell.')
});

const ReportRowSchema: z.ZodType = z.lazy(() =>
    z.object({
        RowType: z.string().optional().describe('Row type such as Header, Section, Row, or SummaryRow.'),
        Title: z.string().optional().describe('Title for the row.'),
        Cells: z.array(ReportCellSchema).optional().describe('Cells contained in the row.'),
        Rows: z.array(ReportRowSchema).optional().describe('Nested child rows under the current row.')
    })
);

const ReportFieldSchema = z.object({
    FieldID: z.string().optional().describe('Field identifier.'),
    Description: z.string().optional().describe('Field description.'),
    Value: z.string().optional().describe('Field value.')
});

const ReportSchema = z.object({
    ReportID: z.string().optional().describe('ID of the report.'),
    ReportName: z.string().optional().describe('Name of the report.'),
    ReportTitle: z.string().optional().describe('Title of the report.'),
    ReportType: z.string().optional().describe('The type of report.'),
    ReportTitles: z.array(z.string()).optional().describe('Report titles array, typically 3 to 4 strings describing the report.'),
    ReportDate: z.string().optional().describe('Date of the report.'),
    UpdatedDateUTC: z.string().optional().describe('Updated date in UTC.'),
    Rows: z.array(ReportRowSchema).optional().describe('Top-level rows in the report.'),
    Fields: z.array(ReportFieldSchema).optional().describe('Additional report fields.')
});

const OutputSchema = z
    .object({
        Reports: z.array(ReportSchema).describe('Array of report objects returned by the endpoint.')
    })
    .describe('Output containing the Trial Balance report.');

/**
 * @tags: [read]
 * @tagReason: Retrieves the organisation's Trial Balance report from Xero.
 */
const action = createAction({
    description: "Get the organisation's Trial Balance report.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.trialbalance.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let tenantId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object') {
            const connectionTenant = connectionConfig['tenant_id'];
            if (typeof connectionTenant === 'string' && connectionTenant.length > 0) {
                tenantId = connectionTenant;
            }
        }

        if (!tenantId) {
            const metadata = connection.metadata;
            if (metadata && typeof metadata === 'object') {
                const metadataTenant = metadata['tenantId'];
                if (typeof metadataTenant === 'string' && metadataTenant.length > 0) {
                    tenantId = metadataTenant;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connections = connectionsResponse.data;

            if (!Array.isArray(connections) || connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z.record(z.string(), z.unknown()).parse(connections[0]);
            const fallbackTenant = firstConnection['tenantId'];
            if (typeof fallbackTenant === 'string' && fallbackTenant.length > 0) {
                tenantId = fallbackTenant;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const params: Record<string, string> = {};
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.paymentsOnly !== undefined) {
            params['paymentsOnly'] = String(input.paymentsOnly);
        }

        // https://developer.xero.com/documentation/api/accounting/reports
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Reports/TrialBalance',
            params,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const raw = z.record(z.string(), z.unknown()).parse(response.data);
        const reportsRaw = raw['Reports'];

        if (!Array.isArray(reportsRaw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected Reports array in response.'
            });
        }

        const parsedReports = reportsRaw.map((report) => ReportSchema.parse(report));

        return {
            Reports: parsedReports
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
