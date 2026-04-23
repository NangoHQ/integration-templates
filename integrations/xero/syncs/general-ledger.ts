import { createSync } from 'nango';
import { z } from 'zod';

const TrackingCategorySchema = z.object({
    name: z.string(),
    option: z.string(),
    trackingCategoryId: z.string(),
    trackingOptionId: z.string(),
    options: z.array(z.unknown())
});

const LedgerLineSchema = z.object({
    journalLineId: z.string(),
    accountId: z.string(),
    accountCode: z.string(),
    accountName: z.string(),
    description: z.string(),
    netAmount: z.number(),
    grossAmount: z.number(),
    taxAmount: z.number(),
    taxType: z.string().optional(),
    taxName: z.string().optional(),
    trackingCategories: z.array(TrackingCategorySchema)
});

const GeneralLedgerSchema = z.object({
    id: z.string(),
    date: z.union([z.string(), z.null()]),
    number: z.number(),
    reference: z.union([z.string(), z.null()]),
    sourceId: z.union([z.string(), z.null()]),
    sourceType: z.union([z.string(), z.null()]),
    createdDate: z.union([z.string(), z.null()]),
    lines: z.array(LedgerLineSchema)
});

const ConnectionsResponseSchema = z.object({
    data: z
        .array(
            z.object({
                tenantId: z.string().optional()
            })
        )
        .optional()
});

function parseDate(xeroDateString: string): Date {
    const match = xeroDateString.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
    if (match && Array.isArray(match) && match.length > 1 && match[1]) {
        const timestamp = parseInt(match[1], 10);
        return new Date(timestamp);
    }
    throw new Error(`Cannot parse date from Xero API with parseDate function, input was: ${xeroDateString}`);
}

async function resolveTenantId(nango: {
    getConnection: () => Promise<unknown>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
}): Promise<string> {
    const rawConnection = await nango.getConnection();

    const isRecord = (val: unknown): val is Record<string, unknown> => val !== null && typeof val === 'object' && !Array.isArray(val);

    const getStringProp = (obj: Record<string, unknown>, key: string): string | undefined => {
        const val = obj[key];
        return typeof val === 'string' && val ? val : undefined;
    };

    if (isRecord(rawConnection)) {
        const connectionConfig = rawConnection['connection_config'];
        if (isRecord(connectionConfig)) {
            const tenantId = getStringProp(connectionConfig, 'tenant_id');
            if (tenantId) return tenantId;
        }

        const metadata = rawConnection['metadata'];
        if (isRecord(metadata)) {
            const tenantId = getStringProp(metadata, 'tenantId');
            if (tenantId) return tenantId;
        }
    }

    // https://developer.xero.com/documentation/api/accounting/connections
    const connectionsResponse = await nango.get({ endpoint: 'connections', retries: 10 });

    const parseResult = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
    if (!parseResult.success) {
        throw new Error('Failed to parse connections response');
    }

    const connections = parseResult.data.data ?? [];
    if (connections.length === 1 && connections[0]?.tenantId) {
        return connections[0].tenantId;
    }
    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    throw new Error('No tenant ID found. Please configure tenant_id in connection_config or tenantId in metadata.');
}

interface XeroTrackingCategory {
    Name?: string;
    Option?: string;
    TrackingCategoryID?: string;
    TrackingOptionID?: string;
    Options?: unknown[];
}

interface XeroJournalLine {
    JournalLineID?: string;
    AccountID?: string;
    AccountCode?: string;
    AccountName?: string;
    Description?: string;
    NetAmount?: number;
    GrossAmount?: number;
    TaxAmount?: number;
    TaxType?: string;
    TaxName?: string;
    TrackingCategories?: XeroTrackingCategory[];
}

interface XeroJournal {
    JournalID?: string;
    JournalDate?: string;
    JournalNumber?: number;
    Reference?: string;
    SourceID?: string;
    SourceType?: string;
    CreatedDateUTC?: string;
    JournalLines?: XeroJournalLine[];
}

function mapJournal(journal: XeroJournal): z.infer<typeof GeneralLedgerSchema> {
    return {
        id: journal.JournalID!,
        date: journal.JournalDate ? parseDate(journal.JournalDate).toISOString() : null,
        number: journal.JournalNumber!,
        reference: journal.Reference ?? null,
        sourceId: journal.SourceID ?? null,
        sourceType: journal.SourceType ?? null,
        createdDate: journal.CreatedDateUTC ? parseDate(journal.CreatedDateUTC).toISOString() : null,
        lines: (journal.JournalLines ?? []).map((line) => {
            const mapped: z.infer<typeof LedgerLineSchema> = {
                journalLineId: line.JournalLineID ?? '',
                accountId: line.AccountID ?? '',
                accountCode: line.AccountCode ?? '',
                accountName: line.AccountName ?? '',
                description: line.Description ?? '',
                netAmount: line.NetAmount ?? 0,
                grossAmount: line.GrossAmount ?? 0,
                taxAmount: line.TaxAmount ?? 0,
                trackingCategories: (line.TrackingCategories ?? []).map((tc) => ({
                    name: tc.Name ?? '',
                    option: tc.Option ?? '',
                    trackingCategoryId: tc.TrackingCategoryID ?? '',
                    trackingOptionId: tc.TrackingOptionID ?? '',
                    options: tc.Options ?? []
                }))
            };

            if (line.TaxType !== undefined) {
                mapped.taxType = line.TaxType;
            }
            if (line.TaxName !== undefined) {
                mapped.taxName = line.TaxName;
            }

            return mapped;
        })
    };
}

const sync = createSync({
    description: 'Sync Xero general ledger journals, each containing journal lines with account and tax details.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    scopes: ['accounting.journals.read'],
    models: {
        GeneralLedger: GeneralLedgerSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/sync-general-ledger', group: 'General Ledger' }],

    exec: async (nango) => {
        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId,
            'If-Modified-Since': ''
        };

        if (nango.lastSyncDate) {
            headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, '');
        }

        let hasMoreRecords = true;
        let highestJournalNumber = 0;

        do {
            // https://developer.xero.com/documentation/api/accounting/journals
            const response = await nango.get<{ Journals: XeroJournal[] }>({
                endpoint: 'api.xro/2.0/Journals',
                headers,
                params: { offset: String(highestJournalNumber) },
                retries: 10
            });

            const journals = response.data.Journals;

            if (!journals || journals.length === 0) {
                hasMoreRecords = false;
                continue;
            }

            await nango.batchSave(journals.map(mapJournal), 'GeneralLedger');

            const maxJournalNumber = Math.max(...journals.map((j) => j.JournalNumber ?? 0));
            if (maxJournalNumber <= highestJournalNumber) {
                hasMoreRecords = false;
                continue;
            }

            highestJournalNumber = maxJournalNumber;
        } while (hasMoreRecords);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
