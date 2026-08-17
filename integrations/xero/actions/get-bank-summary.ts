import { z } from 'zod';
import { createAction } from 'nango';

type ReportCellAttribute = {
    Value?: string | undefined;
    Id?: string | undefined;
};

type ReportCell = {
    Value?: string | undefined;
    Attributes?: ReportCellAttribute[] | undefined;
};

type ReportRow = {
    RowType?: string | undefined;
    Title?: string | undefined;
    Cells?: ReportCell[] | undefined;
    Rows?: ReportRow[] | undefined;
};

const CellAttributeSchema = z
    .object({
        Value: z.string().optional().describe('Attribute value'),
        Id: z.string().optional().describe('Attribute identifier')
    })
    .describe('Attribute within a report cell');

const CellSchema = z
    .object({
        Value: z.string().optional().describe('Cell value'),
        Attributes: z.array(CellAttributeSchema).optional().describe('Nested attributes for the cell')
    })
    .describe('A single cell in a report row');

const RowSchema: z.ZodType<ReportRow> = z.lazy(() =>
    z
        .object({
            RowType: z.string().optional().describe('Type of row, e.g. Header, Section, Row, SummaryRow'),
            Title: z.string().optional().describe('Section title when RowType is Section'),
            Cells: z.array(CellSchema).optional().describe('Cells in this row'),
            Rows: z.array(RowSchema).optional().describe('Nested sub-rows for hierarchical sections')
        })
        .describe('A report row which may contain nested sub-rows')
);

const ReportSchema = z
    .object({
        ReportID: z.string().optional().describe('Unique identifier for the report'),
        ReportName: z.string().optional().describe('Display name of the report'),
        ReportType: z.string().optional().describe('Classification of the report'),
        ReportTitles: z.array(z.string()).optional().describe('Titles displayed at the top of the report'),
        ReportDate: z.string().optional().describe('Date range or label shown on the report'),
        UpdatedDateUTC: z.string().optional().describe('UTC timestamp of when the report was last updated'),
        Rows: z.array(RowSchema).optional().describe('Hierarchical rows that make up the report content')
    })
    .describe('An individual Xero report');

const InputSchema = z
    .object({
        fromDate: z.string().optional().describe('Start date for the report in ISO 8601 format (YYYY-MM-DD)'),
        toDate: z.string().optional().describe('End date for the report in ISO 8601 format (YYYY-MM-DD)')
    })
    .describe('Input for retrieving the Xero Bank Summary report');

const OutputSchema = z
    .object({
        Reports: z.array(ReportSchema).describe('The list of Bank Summary reports returned')
    })
    .describe('Output containing the Xero Bank Summary report');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string().optional()
    })
);

const ProviderResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    Reports: z.array(ReportSchema).optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads the Bank Summary report from Xero.
 * @pitfalls: The connected Xero user must hold the "reports" role or the API returns 403 even with the correct OAuth scope. The output is a raw hierarchical report grid (nested Rows/Cells with string Values) rather than normalized bank account objects.
 */
const action = createAction({
    description: "Get the organisation's Bank Summary report (cash movement per bank account)",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.banksummary.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/reports
            endpoint: 'api.xro/2.0/Reports/BankSummary',
            params: {
                ...(input.fromDate !== undefined && { fromDate: input.fromDate }),
                ...(input.toDate !== undefined && { toDate: input.toDate })
            },
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            Reports: providerData.Reports ?? []
        };
    }
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = ConnectionSchema.parse(await nango.getConnection());

    if (
        connection.connection_config !== undefined &&
        connection.connection_config !== null &&
        'tenant_id' in connection.connection_config &&
        typeof connection.connection_config['tenant_id'] === 'string' &&
        connection.connection_config['tenant_id'].length > 0
    ) {
        return connection.connection_config['tenant_id'];
    }

    const metadata = z
        .record(z.string(), z.unknown())
        .optional()
        .nullable()
        .parse(await nango.getMetadata());

    if (metadata !== undefined && metadata !== null && 'tenantId' in metadata && typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
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

    const connections = ConnectionsResponseSchema.parse(rawConnections);
    const first = connections[0];
    if (first !== undefined && first.tenantId !== undefined && first.tenantId.length > 0) {
        return first.tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
