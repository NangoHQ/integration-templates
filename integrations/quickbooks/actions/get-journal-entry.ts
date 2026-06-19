import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Journal Entry ID. Example: "123"')
});

const OutputSchema = z.object({
    id: z.string(),
    line: z
        .array(
            z.object({
                id: z.string().optional(),
                description: z.string().optional(),
                amount: z.number(),
                detailType: z.string(),
                postingType: z.enum(['Debit', 'Credit']),
                accountRefValue: z.string(),
                accountRefName: z.string().optional()
            })
        )
        .optional(),
    txnDate: z.string().optional(),
    totalAmt: z.number().optional(),
    docNumber: z.string().optional(),
    privateNote: z.string().optional(),
    createTime: z.string().optional(),
    lastUpdatedTime: z.string().optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    syncToken: z.string().optional()
});

// Type guard to check if value is a record object
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Helper to safely get string value from potentially undefined field
function getStringValue(obj: unknown, keys: string[]): string | undefined {
    if (!isRecord(obj)) return undefined;
    for (const key of keys) {
        const val = obj[key];
        if (typeof val === 'string') return val;
    }
    return undefined;
}

// Helper to safely get number value
function getNumberValue(obj: unknown, keys: string[]): number | undefined {
    if (!isRecord(obj)) return undefined;
    for (const key of keys) {
        const val = obj[key];
        if (typeof val === 'number') return val;
    }
    return undefined;
}

// Helper to safely get boolean value
function getBooleanValue(obj: unknown, keys: string[]): boolean | undefined {
    if (!isRecord(obj)) return undefined;
    for (const key of keys) {
        const val = obj[key];
        if (typeof val === 'boolean') return val;
    }
    return undefined;
}

// Helper to safely get array value
function getArrayValue(obj: unknown, keys: string[]): unknown[] | undefined {
    if (!isRecord(obj)) return undefined;
    for (const key of keys) {
        const val = obj[key];
        if (Array.isArray(val)) return val;
    }
    return undefined;
}

// Helper to safely get nested object value
function getObjectValue(obj: unknown, keys: string[]): Record<string, unknown> | undefined {
    if (!isRecord(obj)) return undefined;
    for (const key of keys) {
        const val = obj[key];
        if (isRecord(val)) {
            return val;
        }
    }
    return undefined;
}

const action = createAction({
    description: 'Retrieve a QuickBooks journal entry by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        if (!isRecord(connection.connection_config)) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        const realmId = connection.connection_config['realmId'];

        if (!realmId || typeof realmId !== 'string') {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/journalentry/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Journal entry with ID ${input.id} not found`
            });
        }

        // QuickBooks may wrap the response in a JournalEntry key
        const rawData = isRecord(response.data) ? response.data['JournalEntry'] || response.data : response.data;

        // Extract ID
        const id = getStringValue(rawData, ['Id', 'id']);
        if (!id) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Journal entry ID not found in response'
            });
        }

        // Extract line items
        const rawLines = getArrayValue(rawData, ['Line', 'line']) || [];
        type LineType = {
            id?: string;
            description?: string;
            amount: number;
            detailType: string;
            postingType: 'Debit' | 'Credit';
            accountRefValue: string;
            accountRefName?: string;
        };
        const lines = rawLines
            .map((line: unknown): LineType | null => {
                const lineId = getStringValue(line, ['Id', 'id']);
                const description = getStringValue(line, ['Description', 'description']);
                const amount = getNumberValue(line, ['Amount', 'amount']);
                const detailType = getStringValue(line, ['DetailType', 'detailType']);

                // Handle nested JournalEntryLineDetail (could be PascalCase or camelCase)
                const jeDetail = getObjectValue(line, ['JournalEntryLineDetail', 'journalEntryLineDetail']) || {};
                const postingTypeStr = getStringValue(jeDetail, ['PostingType', 'postingType']);

                // Handle nested AccountRef
                const accountRef = getObjectValue(jeDetail, ['AccountRef', 'accountRef']) || {};
                const accountRefValue = getStringValue(accountRef, ['value', 'Value']);
                const accountRefName = getStringValue(accountRef, ['name', 'Name']);

                if (amount === undefined || detailType === undefined || !postingTypeStr || !accountRefValue) {
                    return null;
                }

                if (postingTypeStr !== 'Debit' && postingTypeStr !== 'Credit') {
                    return null;
                }

                const result: LineType = {
                    amount: amount,
                    detailType: detailType,
                    postingType: postingTypeStr,
                    accountRefValue: accountRefValue
                };

                if (lineId !== undefined) {
                    result.id = lineId;
                }
                if (description !== undefined) {
                    result.description = description;
                }
                if (accountRefName !== undefined) {
                    result.accountRefName = accountRefName;
                }

                return result;
            })
            .filter((line): line is NonNullable<typeof line> => line !== null);

        // Extract other fields
        const txnDate = getStringValue(rawData, ['TxnDate', 'txnDate']);
        const totalAmt = getNumberValue(rawData, ['TotalAmt', 'totalAmt']);
        const docNumber = getStringValue(rawData, ['DocNumber', 'docNumber']);
        const privateNote = getStringValue(rawData, ['PrivateNote', 'privateNote']);
        const domain = getStringValue(rawData, ['domain', 'Domain']);
        const sparse = getBooleanValue(rawData, ['sparse', 'Sparse']);
        const syncToken = getStringValue(rawData, ['SyncToken', 'syncToken']);

        // Handle metadata
        const metadata = getObjectValue(rawData, ['MetaData', 'metadata']);
        const createTime = metadata ? getStringValue(metadata, ['CreateTime', 'createTime']) : undefined;
        const lastUpdatedTime = metadata ? getStringValue(metadata, ['LastUpdatedTime', 'lastUpdatedTime']) : undefined;

        const result: z.infer<typeof OutputSchema> = {
            id: id
        };

        if (lines.length > 0) {
            result.line = lines;
        }
        if (txnDate !== undefined) {
            result.txnDate = txnDate;
        }
        if (totalAmt !== undefined) {
            result.totalAmt = totalAmt;
        }
        if (docNumber !== undefined) {
            result.docNumber = docNumber;
        }
        if (privateNote !== undefined) {
            result.privateNote = privateNote;
        }
        if (createTime !== undefined) {
            result.createTime = createTime;
        }
        if (lastUpdatedTime !== undefined) {
            result.lastUpdatedTime = lastUpdatedTime;
        }
        if (domain !== undefined) {
            result.domain = domain;
        }
        if (sparse !== undefined) {
            result.sparse = sparse;
        }
        if (syncToken !== undefined) {
            result.syncToken = syncToken;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
