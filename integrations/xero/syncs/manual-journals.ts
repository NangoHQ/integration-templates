import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

const XeroTrackingCategorySchema = z.object({
    TrackingCategoryID: z.string().optional().nullable(),
    TrackingOptionID: z.string().optional().nullable(),
    Name: z.string().optional().nullable(),
    Option: z.string().optional().nullable()
});

const XeroJournalLineSchema = z.object({
    JournalLineID: z.string().optional().nullable(),
    AccountID: z.string().optional().nullable(),
    AccountCode: z.string().optional().nullable(),
    AccountName: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    TaxType: z.string().optional().nullable(),
    TaxName: z.string().optional().nullable(),
    Tracking: z.array(XeroTrackingCategorySchema).optional().nullable(),
    Amount: z.number().optional().nullable(),
    IsCredit: z.boolean().optional().nullable(),
    IsActive: z.boolean().optional().nullable()
});

const XeroManualJournalSchema = z.object({
    ManualJournalID: z.string(),
    Date: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
    LineAmountTypes: z.string().optional().nullable(),
    UpdatedDateUTC: z.string().optional().nullable(),
    Narration: z.string().optional().nullable(),
    JournalLines: z.array(XeroJournalLineSchema).optional().nullable(),
    HasAttachments: z.boolean().optional().nullable(),
    Url: z.string().optional().nullable(),
    ShowOnCashBasisReports: z.boolean().optional().nullable()
});

const ManualJournalSchema = z
    .object({
        id: z.string().describe('Unique identifier for the manual journal (ManualJournalID).'),
        manualJournalId: z.string().describe('The Xero ManualJournalID.'),
        date: z.string().optional().describe('Date of the manual journal in YYYY-MM-DD format.'),
        status: z.string().describe('Status of the journal: DRAFT, POSTED, or DELETED.'),
        lineAmountTypes: z.string().optional().describe('Line amount type: Inclusive, Exclusive, or NoTax.'),
        updatedDateUtc: z.string().describe('UTC timestamp when the journal was last updated.'),
        narration: z.string().optional().describe('Description or narration for the journal.'),
        hasAttachments: z.boolean().optional().describe('Whether the journal has file attachments.'),
        url: z.string().optional().describe('URL link to the manual journal in the Xero application.'),
        showOnCashBasisReports: z.boolean().optional().describe('Whether the journal appears on cash basis reports.'),
        journalLines: z
            .array(
                z
                    .object({
                        journalLineId: z.string().optional().describe('Unique identifier for the journal line.'),
                        accountId: z.string().optional().describe('The Xero AccountID for this line.'),
                        accountCode: z.string().optional().describe('Account code for this line.'),
                        accountName: z.string().optional().describe('Display name of the account.'),
                        description: z.string().optional().describe('Description of the journal line.'),
                        taxType: z.string().optional().describe('Tax type applied to this line.'),
                        taxName: z.string().optional().describe('Display name of the tax type.'),
                        tracking: z
                            .array(
                                z
                                    .object({
                                        trackingCategoryId: z.string().optional().describe('Tracking category identifier.'),
                                        trackingOptionId: z.string().optional().describe('Selected tracking option identifier.'),
                                        name: z.string().optional().describe('Name of the tracking category.'),
                                        option: z.string().optional().describe('Selected option name.')
                                    })
                                    .passthrough()
                            )
                            .optional()
                            .describe('Tracking categories assigned to this line.'),
                        amount: z.number().optional().describe('Monetary amount of the line item.'),
                        isCredit: z.boolean().optional().describe('Whether this line is a credit entry.'),
                        isActive: z.boolean().optional().describe('Whether the journal line is active.')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Line items that make up the manual journal.')
    })
    .describe('A Xero manual journal entry.');

function parseXeroDate(value: string): Date | null {
    const match = value.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

const sync = createSync({
    description: 'Sync manual journals from Xero.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ManualJournal: ManualJournalSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const checkpointData = checkpoint == null ? { updated_after: '' } : checkpoint;
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointData);
        if (!parsedCheckpoint.success) {
            throw new Error('Invalid checkpoint: ' + JSON.stringify(parsedCheckpoint.error.issues));
        }

        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.safeParse(connection);
        if (!parsedConnection.success) {
            throw new Error('Invalid connection: ' + JSON.stringify(parsedConnection.error.issues));
        }

        let tenantId: string | undefined;

        const connectionConfig = parsedConnection.data.connection_config;
        if (connectionConfig && typeof connectionConfig['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId) {
            const metadata = parsedConnection.data.metadata;
            if (metadata && typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            if (!Array.isArray(connectionsResponse.data) || connectionsResponse.data.length === 0) {
                throw new Error('No Xero tenants found for this connection.');
            }
            if (connectionsResponse.data.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (parsedConnections.success) {
                const firstTenant = parsedConnections.data[0];
                if (firstTenant && firstTenant.tenantId.length > 0) {
                    tenantId = firstTenant.tenantId;
                }
            }
        }

        if (!tenantId) {
            throw new Error('Unable to resolve xero-tenant-id.');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        const params: Record<string, string> = {};

        if (parsedCheckpoint.data.updated_after.length > 0) {
            headers['If-Modified-Since'] = parsedCheckpoint.data.updated_after;
            params['includeArchived'] = 'true';
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/manualjournals
            endpoint: 'api.xro/2.0/ManualJournals',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'ManualJournals',
                limit_name_in_request: 'pageSize',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(XeroManualJournalSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error('Invalid manual journals page: ' + JSON.stringify(parsedPage.error.issues));
            }

            const journals = parsedPage.data;

            const mapped = journals.map((journal) => {
                const lines = journal.JournalLines || [];
                return {
                    id: journal.ManualJournalID,
                    manualJournalId: journal.ManualJournalID,
                    ...(journal.Date != null && { date: journal.Date }),
                    ...(journal.Status != null && { status: journal.Status }),
                    ...(journal.LineAmountTypes != null && { lineAmountTypes: journal.LineAmountTypes }),
                    ...(journal.UpdatedDateUTC != null && { updatedDateUtc: journal.UpdatedDateUTC }),
                    ...(journal.Narration != null && { narration: journal.Narration }),
                    ...(journal.HasAttachments != null && { hasAttachments: journal.HasAttachments }),
                    ...(journal.Url != null && { url: journal.Url }),
                    ...(journal.ShowOnCashBasisReports != null && { showOnCashBasisReports: journal.ShowOnCashBasisReports }),
                    journalLines: Array.isArray(lines)
                        ? lines.map((line) => {
                              const tracking = line.Tracking || [];
                              return {
                                  ...(line.JournalLineID != null && { journalLineId: line.JournalLineID }),
                                  ...(line.AccountID != null && { accountId: line.AccountID }),
                                  ...(line.AccountCode != null && { accountCode: line.AccountCode }),
                                  ...(line.AccountName != null && { accountName: line.AccountName }),
                                  ...(line.Description != null && { description: line.Description }),
                                  ...(line.TaxType != null && { taxType: line.TaxType }),
                                  ...(line.TaxName != null && { taxName: line.TaxName }),
                                  tracking: Array.isArray(tracking)
                                      ? tracking.map((t) => ({
                                            ...(t.TrackingCategoryID != null && { trackingCategoryId: t.TrackingCategoryID }),
                                            ...(t.TrackingOptionID != null && { trackingOptionId: t.TrackingOptionID }),
                                            ...(t.Name != null && { name: t.Name }),
                                            ...(t.Option != null && { option: t.Option })
                                        }))
                                      : [],
                                  ...(line.Amount != null && { amount: line.Amount }),
                                  ...(line.IsCredit != null && { isCredit: line.IsCredit }),
                                  ...(line.IsActive != null && { isActive: line.IsActive })
                              };
                          })
                        : []
                };
            });

            const activeRecords = mapped.filter((j) => j.status !== 'DELETED');
            const deletedRecords = mapped.filter((j) => j.status === 'DELETED');

            if (activeRecords.length > 0) {
                await nango.batchSave(activeRecords, 'ManualJournal');
            }

            if (parsedCheckpoint.data.updated_after.length > 0 && deletedRecords.length > 0) {
                await nango.batchDelete(deletedRecords, 'ManualJournal');
            }

            let latestUpdatedDate: Date | null = null;

            for (const journal of journals) {
                if (typeof journal.UpdatedDateUTC !== 'string' || journal.UpdatedDateUTC.length === 0) {
                    continue;
                }

                const parsedUpdatedDate = parseXeroDate(journal.UpdatedDateUTC);
                if (parsedUpdatedDate && (!latestUpdatedDate || parsedUpdatedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedUpdatedDate;
                }
            }

            if (latestUpdatedDate) {
                await nango.saveCheckpoint({ updated_after: formatIfModifiedSince(latestUpdatedDate) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
