import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contactId: z.string().describe('Xero Contact ID for the supplier/contact. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        date: z.string().optional().describe('Shows payables up to this date (YYYY-MM-DD). Defaults to end of the current month.'),
        fromDate: z.string().optional().describe('Show all payable invoices from this date for the contact (YYYY-MM-DD).'),
        toDate: z.string().optional().describe('Show all payable invoices to this date for the contact (YYYY-MM-DD).')
    })
    .describe('Input for retrieving the Aged Payables By Contact report.');

const ReportAttributeSchema = z.object({
    Id: z.string().optional().describe('Attribute identifier.'),
    Value: z.string().optional().describe('Attribute value.')
});

const ReportCellSchema = z.object({
    Value: z.string().optional().describe('Cell value.'),
    Attributes: z.array(ReportAttributeSchema).optional().describe('Optional attributes associated with the cell.')
});

const ReportRowSchema = z.object({
    RowType: z.string().optional().describe('Type of row (e.g., Header, Section, Row, SummaryRow).'),
    Cells: z.array(ReportCellSchema).optional().describe('Array of cells in the row.'),
    Rows: z.array(z.record(z.string(), z.unknown())).optional().describe('Nested rows within a section.')
});

const ReportSchema = z.object({
    ReportID: z.string().optional().describe('Unique identifier for the report type.'),
    ReportName: z.string().optional().describe('Human-readable report name.'),
    ReportType: z.string().optional().describe('Report type classification.'),
    ReportTitles: z.array(z.string()).optional().describe('Titles displayed at the top of the report.'),
    ReportDate: z.string().optional().describe('Date the report was generated.'),
    UpdatedDateUTC: z.string().optional().describe('UTC timestamp when the report was last updated.'),
    Rows: z.array(ReportRowSchema).optional().describe('Report rows containing headers, sections, and data.')
});

const OutputSchema = z
    .object({
        reports: z.array(ReportSchema).describe('Array of report objects returned by Xero.')
    })
    .describe('Output containing the Aged Payables By Contact report.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a read-only Aged Payables report from Xero for a specific contact.
 * @pitfalls: Omitting date returns payables only up to the end of the current month, not all history. UpdatedDateUTC is returned in Microsoft's /Date(timestamp)/ format rather than ISO 8601.
 */
const action = createAction({
    description: 'Get the Aged Payables report for a specific contact/supplier.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.reports.aged.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const ConnectionSchema = z.object({
            connection_config: z
                .object({
                    tenant_id: z.string().optional()
                })
                .nullish(),
            metadata: z
                .object({
                    tenantId: z.string().optional()
                })
                .nullish()
        });

        const connection = ConnectionSchema.parse(await nango.getConnection());
        let tenantId: string | undefined;
        if (connection.connection_config?.tenant_id && connection.connection_config.tenant_id.length > 0) {
            tenantId = connection.connection_config.tenant_id;
        } else if (connection.metadata?.tenantId && connection.metadata.tenantId.length > 0) {
            tenantId = connection.metadata.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionsSchema = z.array(
                z.object({
                    tenantId: z.string().optional()
                })
            );

            const connections = ConnectionsSchema.parse(connectionsResponse.data);

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            } else if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            } else {
                const firstConnection = connections[0];
                if (firstConnection?.tenantId && firstConnection.tenantId.length > 0) {
                    tenantId = firstConnection.tenantId;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/reports
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Reports/AgedPayablesByContact',
            headers: {
                'xero-tenant-id': tenantId
            },
            params: {
                contactId: input.contactId,
                ...(input.date !== undefined && { date: input.date }),
                ...(input.fromDate !== undefined && { fromDate: input.fromDate }),
                ...(input.toDate !== undefined && { toDate: input.toDate })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            Reports: z.array(ReportSchema).optional()
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            reports: providerData.Reports ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
