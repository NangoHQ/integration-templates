import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip value) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(1000).optional().describe('Maximum number of records to return. Defaults to 100.'),
    entryId: z.string().uuid().optional().describe('Filter transaction lines by a specific EntryID (UUID). Example: "2ab359f3-0042-4e57-b829-d7d7cc84d1ea"')
});

const TransactionLineSchema = z.object({
    ID: z.string(),
    EntryID: z.string(),
    AmountDC: z.number(),
    GLAccount: z.string().optional(),
    GLAccountCode: z.string().optional(),
    Description: z.string().optional(),
    VATCode: z.string().optional(),
    Modified: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TransactionLineSchema),
    next_cursor: z.string().optional()
});

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

const action = createAction({
    description: 'List financial transaction line details including amounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['FinancialTransactions'],
    endpoint: {
        path: '/actions/list-transaction-lines',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meResponse = await nango.get({
            // https://start.exactonline.fr/docs/HlpRestAPIResources.aspx?SourcePage=496
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = meResponse.data;
        if (!isObject(meData) || !isObject(meData['d'])) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to retrieve current division from Me endpoint'
            });
        }

        let meRecord: Record<string, unknown> | undefined;
        const meD = meData['d'];
        if (Array.isArray(meD['results'])) {
            const results = meD['results'];
            if (results.length > 0 && isObject(results[0])) {
                meRecord = results[0];
            }
        } else if (isObject(meD)) {
            meRecord = meD;
        }

        if (!meRecord) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to find Me record in response'
            });
        }

        const currentDivision = meRecord['CurrentDivision'];
        if (typeof currentDivision !== 'number' && typeof currentDivision !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'CurrentDivision not found in Me response'
            });
        }

        const division = String(currentDivision);
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string | number> = {
            $select: 'ID,EntryID,AmountDC,GLAccount,GLAccountCode,Description,VATCode,Modified',
            $top: limit
        };

        if (skip > 0) {
            params['$skip'] = skip;
        }

        if (input.entryId) {
            params['$filter'] = `EntryID eq guid'${input.entryId}'`;
        }

        const response = await nango.get({
            // https://start.exactonline.fr/docs/HlpRestAPIResources.aspx?SourcePage=496
            endpoint: `/api/v1/${encodeURIComponent(division)}/financialtransaction/TransactionLines`,
            params,
            retries: 3
        });

        const responseData = response.data;
        if (!isObject(responseData) || !isObject(responseData['d'])) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from TransactionLines endpoint'
            });
        }

        const results = responseData['d']['results'];
        if (!Array.isArray(results)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected results array in response'
            });
        }

        const items = results.map((item: unknown) => {
            if (!isObject(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid item in results'
                });
            }

            const amountDc = item['AmountDC'];
            let parsedAmountDc: number;
            if (typeof amountDc === 'number') {
                parsedAmountDc = amountDc;
            } else if (typeof amountDc === 'string') {
                const parsed = parseFloat(amountDc);
                if (!Number.isFinite(parsed)) {
                    throw new nango.ActionError({
                        type: 'invalid_response',
                        message: `Invalid AmountDC value: ${amountDc}`
                    });
                }
                parsedAmountDc = parsed;
            } else {
                parsedAmountDc = 0;
            }

            return {
                ID: typeof item['ID'] === 'string' ? item['ID'] : '',
                EntryID: typeof item['EntryID'] === 'string' ? item['EntryID'] : '',
                AmountDC: parsedAmountDc,
                ...(typeof item['GLAccount'] === 'string' && { GLAccount: item['GLAccount'] }),
                ...(typeof item['GLAccountCode'] === 'string' && { GLAccountCode: item['GLAccountCode'] }),
                ...(typeof item['Description'] === 'string' && { Description: item['Description'] }),
                ...(typeof item['VATCode'] === 'string' && { VATCode: item['VATCode'] }),
                ...(typeof item['Modified'] === 'string' && { Modified: item['Modified'] })
            };
        });

        const nextUrl = responseData['d']['__next'];
        let nextCursor: string | undefined;
        if (typeof nextUrl === 'string') {
            const urlObj = new URL(nextUrl);
            const nextSkip = urlObj.searchParams.get('$skip');
            if (nextSkip) {
                nextCursor = nextSkip;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
