import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for updating a journal entry
// QuickBooks requires Id and SyncToken for updates
// Sparse updates: include only fields being changed
const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the journal entry to update. Example: "123"'),
    sync_token: z.string().describe('The sync token for concurrency control. Required for updates. Example: "0"'),
    txn_date: z.string().optional().describe('The transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
    private_note: z.string().nullable().optional().describe('A private note for the journal entry. Set to null to clear. Example: "Adjusting entry for Q1"'),
    line_items: z
        .array(
            z.object({
                id: z.string().optional().describe('Line item ID for existing lines. Omit for new lines.'),
                description: z.string().optional().describe('Description of the line item.'),
                amount: z.number().describe('The monetary amount of the line item.'),
                detail_type: z.literal('JournalEntryLineDetail').describe('Must be "JournalEntryLineDetail".'),
                journal_entry_line_detail: z.object({
                    posting_type: z.enum(['Debit', 'Credit']).describe('Whether this is a Debit or Credit line.'),
                    account_ref: z.object({
                        value: z.string().describe('The account ID. Example: "1"'),
                        name: z.string().optional().describe('The account name.')
                    })
                })
            })
        )
        .optional()
        .describe('Journal entry line items. Each entry must balance (total debits = total credits).')
});

// QuickBooks JournalEntry response schema (raw provider format)
const ProviderJournalEntrySchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    TxnDate: z.string().optional(),
    PrivateNote: z.string().nullable().optional(),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                Description: z.string().nullable().optional(),
                Amount: z.number(),
                DetailType: z.string(),
                JournalEntryLineDetail: z.object({
                    PostingType: z.string(),
                    AccountRef: z.object({
                        value: z.string(),
                        name: z.string().nullable().optional()
                    })
                })
            })
        )
        .optional(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .optional()
});

// Normalized output schema
const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the journal entry.'),
    sync_token: z.string().describe('The current sync token for concurrency control.'),
    txn_date: z.string().optional().describe('The transaction date.'),
    private_note: z.string().optional().describe('The private note.'),
    line_items: z
        .array(
            z.object({
                id: z.string().optional(),
                description: z.string().optional(),
                amount: z.number(),
                detail_type: z.string(),
                posting_type: z.string(),
                account_id: z.string(),
                account_name: z.string().optional()
            })
        )
        .optional()
});

// Helper to get realmId from connection
async function getRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];

    if (!realmId) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }

    return String(realmId);
}

const action = createAction({
    description: 'Update a QuickBooks journal entry.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // Build the request body with sparse update
        // Only include fields that are provided in the input
        const requestBody: Record<string, unknown> = {
            Id: input.id,
            SyncToken: input.sync_token,
            sparse: true
        };

        if (input.txn_date !== undefined) {
            requestBody['TxnDate'] = input.txn_date;
        }

        if (input.private_note !== undefined) {
            requestBody['PrivateNote'] = input.private_note;
        }

        if (input.line_items !== undefined) {
            requestBody['Line'] = input.line_items.map((line) => ({
                ...(line.id !== undefined && { Id: line.id }),
                ...(line.description !== undefined && { Description: line.description }),
                Amount: line.amount,
                DetailType: line.detail_type,
                JournalEntryLineDetail: {
                    PostingType: line.journal_entry_line_detail.posting_type,
                    AccountRef: {
                        value: line.journal_entry_line_detail.account_ref.value,
                        ...(line.journal_entry_line_detail.account_ref.name !== undefined && {
                            name: line.journal_entry_line_detail.account_ref.name
                        })
                    }
                }
            }));
        }

        // QuickBooks Online Accounting API - JournalEntry update
        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/journalentry`,
            data: requestBody,
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 1
        });

        // QuickBooks may wrap the response in a JournalEntry property
        // Use Zod to safely parse the response wrapper
        const ResponseWrapperSchema = z
            .object({
                JournalEntry: ProviderJournalEntrySchema.optional()
            })
            .passthrough();

        const parsedWrapper = ResponseWrapperSchema.safeParse(response.data);
        const journalEntry =
            parsedWrapper.success && parsedWrapper.data.JournalEntry !== undefined
                ? parsedWrapper.data.JournalEntry
                : ProviderJournalEntrySchema.parse(response.data);

        return {
            id: journalEntry.Id,
            sync_token: journalEntry.SyncToken,
            ...(journalEntry.TxnDate !== undefined && { txn_date: journalEntry.TxnDate }),
            ...(journalEntry.PrivateNote !== undefined && journalEntry.PrivateNote !== null && { private_note: journalEntry.PrivateNote }),
            ...(journalEntry.Line !== undefined && {
                line_items: journalEntry.Line.map((line) => ({
                    ...(line.Id !== undefined && { id: line.Id }),
                    ...(line.Description !== undefined && line.Description !== null && { description: line.Description }),
                    amount: line.Amount,
                    detail_type: line.DetailType,
                    posting_type: line.JournalEntryLineDetail.PostingType,
                    account_id: line.JournalEntryLineDetail.AccountRef.value,
                    ...(line.JournalEntryLineDetail.AccountRef.name !== undefined &&
                        line.JournalEntryLineDetail.AccountRef.name !== null && {
                            account_name: line.JournalEntryLineDetail.AccountRef.name
                        })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
