import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const CreditNoteSchema = z.object({
    id: z.string(),
    Type: z.string().optional(),
    Contact: z.unknown().optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    Status: z.string().optional(),
    LineAmountTypes: z.string().optional(),
    LineItems: z.array(z.unknown()).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional(),
    CreditNoteID: z.string().optional(),
    CreditNoteNumber: z.string().optional(),
    Reference: z.string().optional(),
    RemainingCredit: z.number().optional(),
    FullyPaidOnDate: z.string().optional(),
    SentToContact: z.boolean().optional(),
    HasAttachments: z.boolean().optional(),
    HasErrors: z.boolean().optional()
});

function mapCreditNote(record: Record<string, unknown>): z.infer<typeof CreditNoteSchema> {
    const contact = record['Contact'];
    const contactRecord = contact && typeof contact === 'object' && !Array.isArray(contact) ? contact : undefined;

    const lineItems = record['LineItems'];
    const lineItemsArray = Array.isArray(lineItems) ? lineItems : undefined;

    return {
        id: typeof record['CreditNoteID'] === 'string' ? record['CreditNoteID'] : '',
        Type: typeof record['Type'] === 'string' ? record['Type'] : undefined,
        Contact: contactRecord,
        Date: typeof record['Date'] === 'string' ? record['Date'] : undefined,
        DueDate: typeof record['DueDate'] === 'string' ? record['DueDate'] : undefined,
        Status: typeof record['Status'] === 'string' ? record['Status'] : undefined,
        LineAmountTypes: typeof record['LineAmountTypes'] === 'string' ? record['LineAmountTypes'] : undefined,
        LineItems: lineItemsArray,
        SubTotal: typeof record['SubTotal'] === 'number' ? record['SubTotal'] : undefined,
        TotalTax: typeof record['TotalTax'] === 'number' ? record['TotalTax'] : undefined,
        Total: typeof record['Total'] === 'number' ? record['Total'] : undefined,
        UpdatedDateUTC: typeof record['UpdatedDateUTC'] === 'string' ? record['UpdatedDateUTC'] : undefined,
        CurrencyCode: typeof record['CurrencyCode'] === 'string' ? record['CurrencyCode'] : undefined,
        CreditNoteID: typeof record['CreditNoteID'] === 'string' ? record['CreditNoteID'] : undefined,
        CreditNoteNumber: typeof record['CreditNoteNumber'] === 'string' ? record['CreditNoteNumber'] : undefined,
        Reference: typeof record['Reference'] === 'string' ? record['Reference'] : undefined,
        RemainingCredit: typeof record['RemainingCredit'] === 'number' ? record['RemainingCredit'] : undefined,
        FullyPaidOnDate: typeof record['FullyPaidOnDate'] === 'string' ? record['FullyPaidOnDate'] : undefined,
        SentToContact: typeof record['SentToContact'] === 'boolean' ? record['SentToContact'] : undefined,
        HasAttachments: typeof record['HasAttachments'] === 'boolean' ? record['HasAttachments'] : undefined,
        HasErrors: typeof record['HasErrors'] === 'boolean' ? record['HasErrors'] : undefined
    };
}

function parseXeroDate(value: string): Date | null {
    const match = value.match(/^\/Date\((\d+)(?:[+-]\d{4})?\)\/$/);
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
    description: 'Sync credit notes from Xero.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/credit-notes'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const connection = await nango.getConnection();
        let tenantId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && !Array.isArray(connectionConfig)) {
            const maybeTenantId = connectionConfig['tenant_id'];
            if (typeof maybeTenantId === 'string') {
                tenantId = maybeTenantId;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && !Array.isArray(connection.metadata)) {
            const maybeTenantId = connection.metadata['tenantId'];
            if (typeof maybeTenantId === 'string') {
                tenantId = maybeTenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!Array.isArray(connectionsData)) {
                throw new Error('Unexpected response from Xero connections endpoint.');
            }

            if (connectionsData.length === 0) {
                throw new Error('No tenants found. Please connect a Xero organisation.');
            }

            if (connectionsData.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstConnection = connectionsData[0];
            if (!firstConnection || typeof firstConnection !== 'object') {
                throw new Error('Unexpected connection data format.');
            }

            const tenantIdFromApi = firstConnection['tenantId'];
            if (typeof tenantIdFromApi !== 'string') {
                throw new Error('Unexpected connection data format.');
            }

            tenantId = tenantIdFromApi;
        }

        if (!tenantId) {
            throw new Error('Failed to resolve Xero tenant ID.');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        const params: Record<string, string> = {};

        if (checkpoint && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
            params['includeArchived'] = 'true';
        }

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        for await (const records of nango.paginate({
            endpoint: 'api.xro/2.0/CreditNotes',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'CreditNotes'
            },
            retries: 3
        })) {
            const typedRecords: Record<string, unknown>[] = [];
            for (const record of records) {
                if (record && typeof record === 'object' && !Array.isArray(record)) {
                    typedRecords.push(record);
                }
            }

            const activeRecords = typedRecords.filter((record) => {
                const status = record['Status'];
                return status !== 'DELETED' && status !== 'VOIDED';
            });

            const mappedActive = activeRecords.map(mapCreditNote);
            if (mappedActive.length > 0) {
                await nango.batchSave(mappedActive, 'CreditNote');
            }

            if (checkpoint) {
                const staleRecords = typedRecords.filter((record) => {
                    const status = record['Status'];
                    return status === 'DELETED' || status === 'VOIDED';
                });

                const mappedStale = staleRecords.map(mapCreditNote);
                if (mappedStale.length > 0) {
                    await nango.batchDelete(mappedStale, 'CreditNote');
                }
            }

            let latestUpdatedDate: Date | null = null;
            for (const record of typedRecords) {
                const val = record['UpdatedDateUTC'];
                if (typeof val === 'string') {
                    const parsedUpdatedDate = parseXeroDate(val);
                    if (parsedUpdatedDate && (!latestUpdatedDate || parsedUpdatedDate > latestUpdatedDate)) {
                        latestUpdatedDate = parsedUpdatedDate;
                    }
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
