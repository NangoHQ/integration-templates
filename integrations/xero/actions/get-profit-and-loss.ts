import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        fromDate: z.string().optional().describe('Start date for the report in YYYY-MM-DD format. Example: "2024-01-01"'),
        toDate: z.string().optional().describe('End date for the report in YYYY-MM-DD format. Example: "2024-12-31"'),
        periods: z.number().optional().describe('Number of periods to compare. Example: 12'),
        timeframe: z.string().optional().describe('Period granularity in months. Example: "1" for monthly, "3" for quarterly, "12" for yearly'),
        trackingCategoryID: z.string().optional().describe('Xero Tracking Category ID to filter the report. Example: "297c2dc5-cc47-4afd-8ec8-74990b8761e9"'),
        trackingOptionID: z.string().optional().describe('Xero Tracking Option ID to filter the report. Example: "ae8ffb36-3f76-4710-8e6d-6d1f2e3f52f1"')
    })
    .describe('Input parameters for the Profit and Loss report');

const ReportCellAttributeSchema = z.object({
    Id: z.string().optional().describe('Attribute identifier from Xero'),
    Value: z.string().optional().describe('Attribute value from Xero')
});

const ReportCellSchema = z.object({
    Value: z.union([z.string(), z.number(), z.boolean()]).optional().describe('Cell value'),
    Attributes: z.array(ReportCellAttributeSchema).optional().describe('Cell attributes')
});

type ReportRow = {
    RowType?: string | undefined;
    Title?: string | undefined;
    Cells?: Array<z.infer<typeof ReportCellSchema>> | undefined;
    Rows?: Array<ReportRow> | undefined;
};

const ReportRowSchema: z.ZodType<ReportRow> = z.lazy(() =>
    z.object({
        RowType: z.string().optional().describe('Type of row: Header, Section, Row, or SummaryRow'),
        Title: z.string().optional().describe('Title of the row or section'),
        Cells: z.array(ReportCellSchema).optional().describe('Array of cells in this row'),
        Rows: z.array(ReportRowSchema).optional().describe('Nested rows for Section-type rows')
    })
);

const ReportSchema = z.object({
    ReportID: z.string().optional().describe('Unique identifier for the report'),
    ReportName: z.string().optional().describe('Display name of the report'),
    ReportType: z.string().optional().describe('Report type identifier'),
    ReportTitles: z.array(z.string()).optional().describe('Array of report title strings'),
    ReportDate: z.string().optional().describe('Date the report was generated'),
    UpdatedDateUTC: z.string().optional().describe('Last updated timestamp in Xero date format'),
    Rows: z.array(ReportRowSchema).optional().describe('Nested report rows and sections')
});

const OutputSchema = z
    .object({
        Reports: z.array(ReportSchema).describe('Array of report objects returned by Xero')
    })
    .describe('Profit and Loss report response containing nested Rows, Sections, and Cells');

const ConnectionSchema = z.object({
    tenantId: z.string()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves the organisation's Profit and Loss report from Xero without mutating provider data.
 * @pitfalls: Xero returns UpdatedDateUTC in a non-standard /Date(milliseconds)/ format instead of ISO 8601, so callers must parse it accordingly.
 */
const action = createAction({
    description: "Get the organisation's Profit and Loss report.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.profitandloss.read'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined = undefined;
        if (connection.connection_config && typeof connection.connection_config === 'object' && !Array.isArray(connection.connection_config)) {
            const cc = connection.connection_config;
            if ('tenant_id' in cc && typeof cc['tenant_id'] === 'string' && cc['tenant_id'].length > 0) {
                tenantId = cc['tenant_id'];
            }
        }

        if (!tenantId) {
            if (connection.metadata && typeof connection.metadata === 'object' && !Array.isArray(connection.metadata)) {
                const md = connection.metadata;
                if ('tenantId' in md && typeof md['tenantId'] === 'string' && md['tenantId'].length > 0) {
                    tenantId = md['tenantId'];
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            let connections: Array<{ tenantId: string }> = [];
            if (Array.isArray(connectionsResponse.data)) {
                const parsed = z.array(ConnectionSchema).safeParse(connectionsResponse.data);
                if (parsed.success) {
                    connections = parsed.data;
                }
            }

            if (connections.length === 0) {
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

            const firstConnection = connections[0];
            if (firstConnection && firstConnection.tenantId.length > 0) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const params: Record<string, string | number> = {};
        if (input['fromDate'] !== undefined) {
            params['fromDate'] = input['fromDate'];
        }
        if (input['toDate'] !== undefined) {
            params['toDate'] = input['toDate'];
        }
        if (input['periods'] !== undefined) {
            params['periods'] = input['periods'];
        }
        if (input['timeframe'] !== undefined) {
            params['timeframe'] = input['timeframe'];
        }
        if (input['trackingCategoryID'] !== undefined) {
            params['trackingCategoryID'] = input['trackingCategoryID'];
        }
        if (input['trackingOptionID'] !== undefined) {
            params['trackingOptionID'] = input['trackingOptionID'];
        }

        // https://developer.xero.com/documentation/api/accounting/reports
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Reports/ProfitAndLoss',
            params,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
