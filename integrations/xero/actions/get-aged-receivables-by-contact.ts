import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contactId: z.string().describe('The Xero Contact ID for the customer. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        date: z.string().optional().describe('Show payments up to this date (YYYY-MM-DD). Defaults to end of current month.'),
        fromDate: z.string().optional().describe('Show all invoices from this date (YYYY-MM-DD).'),
        toDate: z.string().optional().describe('Show all invoices to this date (YYYY-MM-DD).')
    })
    .describe('Input for retrieving the Aged Receivables By Contact report from Xero.');

const ProviderCellAttributeSchema = z.object({
    Id: z.string(),
    Value: z.string()
});

const ProviderCellSchema = z.object({
    Value: z.string().optional(),
    Attributes: z.array(ProviderCellAttributeSchema).optional()
});

const ProviderReportRowSchema = z.object({
    RowType: z.string(),
    Title: z.string().optional(),
    Cells: z.array(ProviderCellSchema).optional(),
    Rows: z.array(z.unknown()).optional()
});

const ProviderReportSchema = z.object({
    ReportName: z.string(),
    ReportType: z.string(),
    ReportTitles: z.array(z.string()).optional(),
    ReportDate: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    Fields: z.array(z.unknown()).optional(),
    Rows: z.array(ProviderReportRowSchema).optional()
});

const ProviderResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    Reports: z.array(ProviderReportSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The response identifier.'),
        status: z.string().describe('The response status.'),
        providerName: z.string().optional().describe('The name of the provider.'),
        dateTimeUtc: z.string().optional().describe('The UTC date/time of the response.'),
        reports: z
            .array(
                z.object({
                    reportName: z.string().describe('The name of the report.'),
                    reportType: z.string().describe('The type of the report.'),
                    reportTitles: z.array(z.string()).optional().describe('Titles displayed on the report.'),
                    reportDate: z.string().optional().describe('The date the report was generated.'),
                    updatedDateUtc: z.string().optional().describe('The UTC date/time the report was last updated.'),
                    fields: z.array(z.unknown()).optional().describe('Report fields metadata.'),
                    rows: z
                        .array(
                            z.object({
                                rowType: z.string().describe('The type of row (Header, Section, Row, SummaryRow).'),
                                title: z.string().optional().describe('The section title, if applicable.'),
                                cells: z
                                    .array(
                                        z.object({
                                            value: z.string().optional().describe('The cell value.'),
                                            attributes: z
                                                .array(
                                                    z.object({
                                                        id: z.string().describe('Attribute identifier.'),
                                                        value: z.string().describe('Attribute value.')
                                                    })
                                                )
                                                .optional()
                                                .describe('Optional attributes linking the cell to an entity ID.')
                                        })
                                    )
                                    .optional()
                                    .describe('Cells in this row.'),
                                rows: z.array(z.unknown()).optional().describe('Nested rows within a section.')
                            })
                        )
                        .optional()
                        .describe('Rows that make up the report body.')
                })
            )
            .optional()
            .describe('The array of reports returned.')
    })
    .describe('Output of the Aged Receivables By Contact report from Xero.');

/**
 * @tags: [read]
 * @tagReason: Reads the Aged Receivables report for a specific contact from Xero.
 * @pitfalls: contactId is mandatory; omitting it returns a 400 ValidationException. Report rows may include credit notes alongside invoices, showing negative totals for credits.
 */
const action = createAction({
    description: 'Get the Aged Receivables report for a specific contact/customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.agedreceivablesbycontact.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfig = z.object({ tenant_id: z.string().optional() }).safeParse(connection.connection_config);
        const metadata = z.object({ tenantId: z.string().optional() }).safeParse(connection.metadata);

        let tenantId: string | undefined;
        if (connectionConfig.success && connectionConfig.data.tenant_id) {
            tenantId = connectionConfig.data.tenant_id;
        } else if (metadata.success && metadata.data.tenantId) {
            tenantId = metadata.data.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = z.object({ data: z.array(z.object({}).passthrough()) }).safeParse(connectionsResponse);
            if (!connectionsData.success || connectionsData.data.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            const connections = connectionsData.data.data;
            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z.object({ tenantId: z.string().optional() }).safeParse(connections[0]);
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

        const params: Record<string, string> = {
            contactId: input.contactId
        };
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.fromDate !== undefined) {
            params['fromDate'] = input.fromDate;
        }
        if (input.toDate !== undefined) {
            params['toDate'] = input.toDate;
        }

        // https://developer.xero.com/documentation/api/accounting/reports
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Reports/AgedReceivablesByContact',
            headers: {
                'xero-tenant-id': tenantId
            },
            params,
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);

        if (!raw.Reports || raw.Reports.length === 0) {
            throw new nango.ActionError({
                type: 'empty_report',
                message: 'No report data returned from Xero.'
            });
        }

        return {
            id: raw.Id,
            status: raw.Status,
            ...(raw.ProviderName !== undefined && { providerName: raw.ProviderName }),
            ...(raw.DateTimeUTC !== undefined && { dateTimeUtc: raw.DateTimeUTC }),
            ...(raw.Reports !== undefined && {
                reports: raw.Reports.map((report) => ({
                    reportName: report.ReportName,
                    reportType: report.ReportType,
                    ...(report.ReportTitles !== undefined && { reportTitles: report.ReportTitles }),
                    ...(report.ReportDate !== undefined && { reportDate: report.ReportDate }),
                    ...(report.UpdatedDateUTC !== undefined && { updatedDateUtc: report.UpdatedDateUTC }),
                    ...(report.Fields !== undefined && { fields: report.Fields }),
                    ...(report.Rows !== undefined && {
                        rows: report.Rows.map((row) => ({
                            rowType: row.RowType,
                            ...(row.Title !== undefined && { title: row.Title }),
                            ...(row.Cells !== undefined && {
                                cells: row.Cells.map((cell) => ({
                                    ...(cell.Value !== undefined && { value: cell.Value }),
                                    ...(cell.Attributes !== undefined && {
                                        attributes: cell.Attributes.map((attr) => ({
                                            id: attr.Id,
                                            value: attr.Value
                                        }))
                                    })
                                }))
                            }),
                            ...(row.Rows !== undefined && { rows: row.Rows })
                        }))
                    })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
