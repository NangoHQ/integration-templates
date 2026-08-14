import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        date: z.string().optional().describe('The date for the balance sheet report in YYYY-MM-DD format. Example: "2024-06-30"'),
        periods: z.number().optional().describe('The number of periods to compare in the report. Example: 3'),
        timeframe: z.string().optional().describe('The timeframe for the periods. Example: "1", "3", "6", or "12".'),
        trackingOptionID1: z.string().optional().describe('The first tracking option ID to filter the report by.'),
        trackingOptionID2: z.string().optional().describe('The second tracking option ID to filter the report by.'),
        standardLayout: z.boolean().optional().describe('Whether to use the standard layout for the report.'),
        paymentsOnly: z.boolean().optional().describe('Whether to show only payments in the report.')
    })
    .describe('Input parameters for retrieving the Balance Sheet report.');

const ReportAttributeSchema = z
    .object({
        Value: z.string().optional().describe('The attribute value.'),
        Id: z.string().optional().describe('The attribute ID.')
    })
    .describe('An attribute associated with a report cell.');

const ReportCellSchema = z
    .object({
        Value: z.string().optional().describe('The value displayed in the cell.'),
        Attributes: z.array(ReportAttributeSchema).optional().describe('Optional attributes providing extra context for the cell value.')
    })
    .describe('A single cell within a report row.');

interface ReportRow {
    RowType?: string | undefined;
    Title?: string | undefined;
    Cells?: Array<z.infer<typeof ReportCellSchema>> | undefined;
    Rows?: Array<ReportRow> | undefined;
}

const ReportRowSchema: z.ZodType<ReportRow> = z.lazy(() =>
    z
        .object({
            RowType: z.string().optional().describe('The type of row, such as Header, Section, Row, or SummaryRow.'),
            Title: z.string().optional().describe('The title or label for the row.'),
            Cells: z.array(ReportCellSchema).optional().describe('The cells contained in this row.'),
            Rows: z.array(ReportRowSchema).optional().describe('Nested rows within this row, used for sections and sub-sections.')
        })
        .describe('A row within a report section.')
);

const ReportSchema = z
    .object({
        ReportID: z.string().describe('The unique identifier for the report.'),
        ReportName: z.string().describe('The display name of the report.'),
        ReportType: z.string().optional().describe('The classification of the report.'),
        ReportTitles: z.array(z.string()).optional().describe('The titles displayed at the top of the report.'),
        ReportDate: z.string().optional().describe('The effective date of the report data.'),
        UpdatedDateUTC: z.string().optional().describe('The timestamp when the report was last updated, in UTC.'),
        Rows: z.array(ReportRowSchema).describe('The top-level rows that make up the report structure.')
    })
    .describe('A single report returned by the Xero API.');

const OutputSchema = z
    .object({
        Reports: z.array(ReportSchema).describe('The array of reports returned. Typically contains a single Balance Sheet report.')
    })
    .describe('The output of the Get Balance Sheet Report action, containing the nested report structure.');

/**
 * @tags: [read]
 * @tagReason: Retrieves the organisation's Balance Sheet report from the Xero Accounting API.
 * @pitfalls: UpdatedDateUTC is returned in a non-standard /Date(ms)/ format instead of ISO 8601, and some Section rows may have an empty Title.
 */
const action = createAction({
    description: "Get the organisation's Balance Sheet report.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.balancesheet.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const ConnectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).nullable().optional(),
            metadata: z.record(z.string(), z.unknown()).nullable().optional()
        });

        const parsedConnection = ConnectionSchema.parse(connection);

        let tenantId: string | undefined;

        if (parsedConnection.connection_config && typeof parsedConnection.connection_config === 'object') {
            const tenantIdValue = parsedConnection.connection_config['tenant_id'];
            if (typeof tenantIdValue === 'string' && tenantIdValue.length > 0) {
                tenantId = tenantIdValue;
            }
        }

        if (!tenantId && parsedConnection.metadata && typeof parsedConnection.metadata === 'object') {
            const tenantIdValue = parsedConnection.metadata['tenantId'];
            if (typeof tenantIdValue === 'string' && tenantIdValue.length > 0) {
                tenantId = tenantIdValue;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const rawConnections = connectionsResponse.data;
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

            const firstConnection = z.object({ tenantId: z.string().optional() }).safeParse(rawConnections[0]);
            if (firstConnection.success && firstConnection.data.tenantId && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const params: Record<string, string | number> = {};

        if (input['date'] !== undefined) {
            params['date'] = input['date'];
        }
        if (input['periods'] !== undefined) {
            params['periods'] = input['periods'];
        }
        if (input['timeframe'] !== undefined) {
            params['timeframe'] = input['timeframe'];
        }
        if (input['trackingOptionID1'] !== undefined) {
            params['trackingOptionID1'] = input['trackingOptionID1'];
        }
        if (input['trackingOptionID2'] !== undefined) {
            params['trackingOptionID2'] = input['trackingOptionID2'];
        }
        if (input['standardLayout'] !== undefined) {
            params['standardLayout'] = String(input['standardLayout']);
        }
        if (input['paymentsOnly'] !== undefined) {
            params['paymentsOnly'] = String(input['paymentsOnly']);
        }

        // https://developer.xero.com/documentation/api/accounting/reports
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Reports/BalanceSheet',
            headers: {
                'xero-tenant-id': tenantId
            },
            params,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
