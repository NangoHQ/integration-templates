import { z } from 'zod';
import { createAction } from 'nango';

const AccountRefSchema = z.object({
    value: z.string().describe('Account ID. Example: "39"'),
    name: z.string().optional().describe('Account name. Example: "Opening Bal Equity"')
});

const JournalEntryLineDetailSchema = z.object({
    PostingType: z.enum(['Debit', 'Credit']).describe('Posting type: Debit or Credit'),
    AccountRef: AccountRefSchema
});

const LineSchema = z.object({
    Id: z.string().optional().describe('Line ID (integer as string). Example: "0"'),
    Description: z.string().optional().describe('Line description'),
    Amount: z.number().describe('Line amount. Must balance with other lines'),
    DetailType: z.literal('JournalEntryLineDetail'),
    JournalEntryLineDetail: JournalEntryLineDetailSchema
});

const InputSchema = z.object({
    Line: z.array(LineSchema).min(2).describe('Journal entry lines. Must include at least two lines that balance: one Debit and one Credit'),
    TxnDate: z.string().optional().describe('Transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
    PrivateNote: z.string().optional().describe('Private note for the journal entry'),
    DocNumber: z.string().optional().describe('Document number for the journal entry')
});

const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const ProviderAccountRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const ProviderJournalEntryLineDetailSchema = z.object({
    PostingType: z.string(),
    AccountRef: ProviderAccountRefSchema
});

const ProviderLineSchema = z.object({
    Id: z.string(),
    LineNum: z.number().optional(),
    Description: z.string().optional(),
    Amount: z.number(),
    DetailType: z.string(),
    JournalEntryLineDetail: ProviderJournalEntryLineDetailSchema
});

const ProviderResponseSchema = z.object({
    JournalEntry: z.object({
        Id: z.string(),
        SyncToken: z.string(),
        TxnDate: z.string().optional(),
        MetaData: MetaDataSchema,
        DocNumber: z.string().optional(),
        PrivateNote: z.string().optional(),
        Line: z.array(ProviderLineSchema)
    })
});

const OutputSchema = z.object({
    id: z.string().describe('Journal entry ID'),
    sync_token: z.string().describe('Sync token for updates'),
    txn_date: z.string().optional().describe('Transaction date'),
    doc_number: z.string().optional().describe('Document number'),
    private_note: z.string().optional().describe('Private note'),
    line_count: z.number().describe('Number of lines in the journal entry'),
    created_at: z.string().describe('Creation timestamp'),
    updated_at: z.string().describe('Last update timestamp')
});

const MetadataSchema = z.object({
    realmId: z.string().optional().describe('Company realm ID for QuickBooks (used in tests)')
});

async function getRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    let realmId: unknown = connection.connection_config?.['realmId'];

    // Fallback to metadata for test environment
    if (!realmId) {
        const metadata = await nango.getMetadata();
        if (metadata && typeof metadata === 'object' && 'realmId' in metadata) {
            const metadataRealmId = metadata['realmId'];
            if (typeof metadataRealmId === 'string') {
                realmId = metadataRealmId;
            }
        }
    }

    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }

    return realmId;
}

const action = createAction({
    description: 'Create a QuickBooks journal entry',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-journal-entry',
        group: 'Journal Entries'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // Validate that lines balance (debits equal credits)
        const totalDebits = input.Line.filter((line) => line.JournalEntryLineDetail.PostingType === 'Debit').reduce((sum, line) => sum + line.Amount, 0);
        const totalCredits = input.Line.filter((line) => line.JournalEntryLineDetail.PostingType === 'Credit').reduce((sum, line) => sum + line.Amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.001) {
            throw new nango.ActionError({
                type: 'unbalanced_entry',
                message: 'Journal entry must balance: total debits must equal total credits',
                total_debits: totalDebits,
                total_credits: totalCredits
            });
        }

        const requestBody: Record<string, unknown> = {
            Line: input.Line
        };

        if (input.TxnDate !== undefined) {
            requestBody['TxnDate'] = input.TxnDate;
        }
        if (input.PrivateNote !== undefined) {
            requestBody['PrivateNote'] = input.PrivateNote;
        }
        if (input.DocNumber !== undefined) {
            requestBody['DocNumber'] = input.DocNumber;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/journalentry`,
            data: requestBody,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const journalEntry = providerData.JournalEntry;

        return {
            id: journalEntry.Id,
            sync_token: journalEntry.SyncToken,
            txn_date: journalEntry.TxnDate,
            doc_number: journalEntry.DocNumber,
            private_note: journalEntry.PrivateNote,
            line_count: journalEntry.Line.length,
            created_at: journalEntry.MetaData.CreateTime,
            updated_at: journalEntry.MetaData.LastUpdatedTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
