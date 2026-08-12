import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        date: z.string().optional().describe('The date for the budget summary report in YYYY-MM-DD format. Defaults to the current date if omitted.'),
        periods: z.number().optional().describe('The number of periods to compare (default is 1).'),
        timeframe: z.number().optional().describe('The period size to compare to (1=month, 3=quarter, 6=half-year, 12=year).')
    })
    .describe('Input for the Xero Budget Summary report.');

const ReportCellAttributeSchema = z
    .object({
        Value: z.string().optional().describe('The attribute value.'),
        Id: z.string().optional().describe('The attribute identifier.')
    })
    .describe('An attribute on a report cell.');

const ReportCellSchema = z
    .object({
        Value: z.string().optional().describe('The cell value.'),
        Attributes: z.array(ReportCellAttributeSchema).optional().describe('Attributes associated with the cell.')
    })
    .describe('A cell in a report row.');

const ReportRowSchema: z.ZodType<{
    RowType?: string | undefined;
    Title?: string | undefined;
    Cells?: z.infer<typeof ReportCellSchema>[] | undefined;
    Rows?: z.infer<typeof ReportRowSchema>[] | undefined;
}> = z.lazy(() =>
    z
        .object({
            RowType: z.string().optional().describe('The type of row (Header, Section, Row, SummaryRow).'),
            Title: z.string().optional().describe('The title of the section or row.'),
            Cells: z.array(ReportCellSchema).optional().describe('The cells in this row.'),
            Rows: z.array(ReportRowSchema).optional().describe('Nested rows within this section or row.')
        })
        .describe('A row in a report, which may contain nested rows.')
);

const ReportSchema = z
    .object({
        ReportID: z.string().optional().describe('The unique identifier of the report.'),
        ReportName: z.string().optional().describe('The name of the report.'),
        ReportType: z.string().optional().describe('The type of the report.'),
        ReportTitles: z.array(z.string()).optional().describe('The titles displayed on the report.'),
        ReportDate: z.string().optional().describe('The date of the report.'),
        UpdatedDateUTC: z.string().optional().describe('The last updated timestamp in UTC.'),
        Rows: z.array(ReportRowSchema).optional().describe('The rows that make up the report content.')
    })
    .describe('A Xero report object.');

const OutputSchema = z
    .object({
        reports: z.array(ReportSchema).describe('The list of reports returned by the API.')
    })
    .describe('Output containing the Xero Budget Summary report.');

/**
 * @tags: [read]
 * @tagReason: Reads the organisation's Budget Summary report from Xero.
 * @pitfalls: Tokens created before March 2026 may lack the accounting.reports.budgetsummary.read scope and require re-consent.
 */
const action = createAction({
    description: "Get the organisation's Budget Summary report.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.budgetsummary.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const params: Record<string, string> = {};
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.periods !== undefined) {
            params['periods'] = String(input.periods);
        }
        if (input.timeframe !== undefined) {
            params['timeframe'] = String(input.timeframe);
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/reports
            endpoint: 'api.xro/2.0/Reports/BudgetSummary',
            params,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Xero Budget Summary API.'
            });
        }

        const data = z
            .object({
                Reports: z.array(z.unknown()).optional()
            })
            .parse(raw);

        const reports = (data.Reports || []).map((report: unknown) => ReportSchema.parse(report));

        return {
            reports
        };
    }
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfig = z.object({}).passthrough().nullish().parse(connection.connection_config);
    if (connectionConfig && typeof connectionConfig['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
        return connectionConfig['tenant_id'];
    }

    const metadata = z.object({}).passthrough().nullish().parse(connection.metadata);
    if (metadata && typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
        return metadata['tenantId'];
    }

    const connectionsResponse = await nango.get({
        // https://developer.xero.com/documentation/api/accounting/overview
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

    const connectionsData = z
        .array(
            z.object({
                tenantId: z.string().optional()
            })
        )
        .parse(rawConnections);

    const first = connectionsData[0];
    if (first && typeof first.tenantId === 'string' && first.tenantId.length > 0) {
        return first.tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
