import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CursorSchema = z.object({
    skip: z.number().optional(),
    modified_after: z.string().optional()
});

const MeResultSchema = z
    .object({
        CurrentDivision: z.number().optional()
    })
    .passthrough();

const MeResponseSchema = z
    .object({
        d: z
            .object({
                results: z.array(z.unknown()).optional()
            })
            .passthrough()
    })
    .passthrough();

const ProviderEntrySchema = z
    .object({
        EntryID: z.string(),
        EntryNumber: z.number().optional().nullable(),
        Supplier: z.string().optional().nullable(),
        AmountDC: z.number().optional().nullable(),
        EntryDate: z.string().optional().nullable(),
        Status: z.number().optional().nullable(),
        Modified: z.string().optional().nullable()
    })
    .passthrough();

const PurchaseEntrySchema = z.object({
    EntryID: z.string(),
    EntryNumber: z.number().optional(),
    Supplier: z.string().optional(),
    AmountDC: z.number().optional(),
    EntryDate: z.string().optional(),
    Status: z.number().optional(),
    Modified: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(PurchaseEntrySchema),
    nextCursor: z.string().optional()
});
function parseODataDate(value: string | null | undefined): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const match = value.match(/^\/Date\((\d+)\)\/$/);
    if (match && match[1] !== undefined) {
        return new Date(parseInt(match[1], 10)).toISOString();
    }
    return value;
}

const action = createAction({
    description: 'List purchase invoice entries.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchaseentry.PurchaseEntries'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursorData = input.cursor ? CursorSchema.parse(JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf-8'))) : { skip: 0 };
        const skip = cursorData.skip ?? 0;
        const modifiedAfter = cursorData.modified_after;

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-Current_Me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const meResult = meData.d?.results?.[0];
        if (!meResult) {
            throw new nango.ActionError({
                type: 'missing_me',
                message: 'Could not retrieve current user information.'
            });
        }

        const meParsed = MeResultSchema.parse(meResult);
        const division = meParsed.CurrentDivision;
        if (division === undefined || division === null) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'CurrentDivision not found in /api/v1/current/Me response.'
            });
        }

        const params: Record<string, string | number> = {
            $top: 100,
            $skip: skip,
            $orderby: 'Modified asc',
            $select: 'EntryID,EntryNumber,Supplier,AmountDC,EntryDate,Status,Modified'
        };

        if (modifiedAfter) {
            params['$filter'] = `Modified gt datetime'${modifiedAfter}'`;
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-PurchaseEntries
        const response = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/purchaseentry/PurchaseEntries`,
            params,
            retries: 3
        });

        const data = z
            .object({
                d: z
                    .object({
                        results: z.array(z.unknown()).optional(),
                        __next: z.string().optional()
                    })
                    .passthrough()
            })
            .passthrough()
            .parse(response.data);

        const results = data.d.results ?? [];
        const nextLink = data.d.__next;

        const items = results.map((entry: unknown) => {
            const parsed = ProviderEntrySchema.parse(entry);
            return {
                EntryID: parsed.EntryID,
                ...(parsed.EntryNumber !== undefined && parsed.EntryNumber !== null && { EntryNumber: parsed.EntryNumber }),
                ...(parsed.Supplier !== undefined && parsed.Supplier !== null && { Supplier: parsed.Supplier }),
                ...(parsed.AmountDC !== undefined && parsed.AmountDC !== null && { AmountDC: parsed.AmountDC }),
                ...(parsed.EntryDate !== undefined && parsed.EntryDate !== null && { EntryDate: parseODataDate(parsed.EntryDate) }),
                ...(parsed.Status !== undefined && parsed.Status !== null && { Status: parsed.Status }),
                ...(parsed.Modified !== undefined && parsed.Modified !== null && { Modified: parseODataDate(parsed.Modified) })
            };
        });

        let nextCursor: string | undefined;
        if (nextLink) {
            const url = new URL(nextLink);
            const nextSkip = url.searchParams.get('$skip');
            if (nextSkip) {
                const nextCursorPayload = {
                    skip: parseInt(nextSkip, 10),
                    ...(modifiedAfter !== undefined && { modified_after: modifiedAfter })
                };
                nextCursor = Buffer.from(JSON.stringify(nextCursorPayload)).toString('base64');
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
