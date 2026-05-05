import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor representing the STARTPOSITION for the next page. Omit for the first page.'),
    updated_after: z.string().optional().describe('Filter journal entries updated after this timestamp (ISO 8601 format). Example: "2024-01-01T00:00:00Z"')
});

const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const JournalEntryLineDetailSchema = z.object({
    PostingType: z.string().optional(),
    AccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional().nullable()
        })
        .optional()
});

const JournalEntryLineSchema = z.object({
    Id: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    Amount: z.number(),
    DetailType: z.string(),
    JournalEntryLineDetail: JournalEntryLineDetailSchema.optional()
});

const ProviderJournalEntrySchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    TxnDate: z.string(),
    PrivateNote: z.string().optional().nullable(),
    TotalAmt: z.number(),
    MetaData: MetaDataSchema,
    Status: z.string().optional().nullable(),
    Line: z.array(JournalEntryLineSchema)
});

const ProviderQueryResponseSchema = z.object({
    JournalEntry: z.array(ProviderJournalEntrySchema).optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: ProviderQueryResponseSchema
});

const JournalEntryOutputSchema = z.object({
    id: z.string(),
    sync_token: z.string(),
    transaction_date: z.string(),
    private_note: z.string().optional(),
    total_amount: z.number(),
    status: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    lines: z.array(
        z.object({
            id: z.string().optional(),
            description: z.string().optional(),
            amount: z.number(),
            posting_type: z.string().optional(),
            account_id: z.string().optional(),
            account_name: z.string().optional()
        })
    )
});

const OutputSchema = z.object({
    items: z.array(JournalEntryOutputSchema),
    next_cursor: z.string().optional()
});

async function getRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    // https://nango.dev/docs/reference/scripts/runtime/sdk#getconnection
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];

    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }

    return realmId;
}

const action = createAction({
    description: 'List QuickBooks journal entries with optional filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-journal-entries',
        group: 'Journal Entries'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);
        const maxResults = 100;
        const startPosition = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (isNaN(startPosition) || startPosition < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor. Cursor must be a positive integer representing the STARTPOSITION.'
            });
        }

        let whereClause = '';
        if (input.updated_after) {
            whereClause = ` WHERE MetaData.LastUpdatedTime > '${input.updated_after}'`;
        }

        const query = `SELECT * FROM JournalEntry${whereClause} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry#query-a-journalentry
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: {
                query
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const entries = parsed.QueryResponse.JournalEntry ?? [];

        const items = entries.map((entry) => {
            const lines = entry.Line.map((line) => {
                const detail = line.JournalEntryLineDetail;
                return {
                    id: line.Id ?? undefined,
                    description: line.Description ?? undefined,
                    amount: line.Amount,
                    posting_type: detail?.PostingType ?? undefined,
                    account_id: detail?.AccountRef?.value ?? undefined,
                    account_name: detail?.AccountRef?.name ?? undefined
                };
            });

            return {
                id: entry.Id,
                sync_token: entry.SyncToken,
                transaction_date: entry.TxnDate,
                private_note: entry.PrivateNote ?? undefined,
                total_amount: entry.TotalAmt,
                status: entry.Status ?? undefined,
                created_at: entry.MetaData.CreateTime,
                updated_at: entry.MetaData.LastUpdatedTime,
                lines
            };
        });

        const nextCursor = entries.length === maxResults ? String(startPosition + maxResults) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
