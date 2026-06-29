import { z } from 'zod';
import { createAction } from 'nango';

function parseExactDate(dateValue: string | null | undefined): string | undefined {
    if (dateValue == null) {
        return undefined;
    }
    const match = dateValue.match(/^\/Date\((\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        const timestamp = parseInt(match[1], 10);
        return new Date(timestamp).toISOString();
    }
    return dateValue;
}

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response ($skiptoken). Omit for the first page.'),
    modified_after: z.string().optional().describe('ISO 8601 timestamp to filter documents modified after this date. Example: 2024-05-30T00:00:00Z')
});

const DocumentSchema = z.object({
    ID: z.string().describe('Document ID. Example: c9a8297e-61a3-4adc-bc17-167e5a7f45c5'),
    Subject: z.string().optional().describe('Document subject'),
    DocumentDate: z.string().optional().describe('Document date. Example: 2024-05-30'),
    Modified: z.string().optional().describe('Last modified timestamp. Example: 2024-05-30T12:00:00Z')
});

const OutputSchema = z.object({
    items: z.array(DocumentSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page. Pass as cursor on the next call.')
});

const MeResponseSchema = z.object({
    d: z
        .object({
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.union([z.string(), z.number()])
                    })
                )
                .optional(),
            CurrentDivision: z.union([z.string(), z.number()]).optional()
        })
        .optional()
});

const DocsResponseSchema = z.object({
    d: z
        .object({
            results: z
                .array(
                    z.object({
                        ID: z.string(),
                        Subject: z.string().nullable().optional(),
                        DocumentDate: z.string().nullable().optional(),
                        Modified: z.string().nullable().optional()
                    })
                )
                .optional(),
            __next: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List documents (invoice PDFs, attachments)',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-documents'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SystemMe
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);

        let division: string;
        const meResults = meData.d?.results;
        if (meResults && meResults.length > 0) {
            const firstMe = meResults[0];
            if (firstMe) {
                division = String(firstMe.CurrentDivision);
            } else {
                throw new nango.ActionError({
                    type: 'missing_division',
                    message: 'Could not determine current division from Me endpoint'
                });
            }
        } else if (meData.d?.CurrentDivision !== undefined) {
            division = String(meData.d.CurrentDivision);
        } else {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from Me endpoint'
            });
        }

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=DocumentsDocuments
        const params: Record<string, string> = {
            $select: 'ID,Subject,DocumentDate,Modified',
            $orderby: 'Modified asc',
            $top: '100'
        };

        if (input.cursor) {
            params['$skiptoken'] = input.cursor;
        } else if (input.modified_after) {
            params['$filter'] = `Modified ge datetime'${input.modified_after}'`;
        }

        const docsResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/documents/Documents`,
            params,
            retries: 3
        });

        const docsData = DocsResponseSchema.parse(docsResponse.data);

        const results = docsData.d?.results ?? [];

        const items = results.map((item) => {
            const documentDate = parseExactDate(item.DocumentDate);
            const modified = parseExactDate(item.Modified);
            return {
                ID: item.ID,
                ...(item.Subject != null && { Subject: item.Subject }),
                ...(documentDate != null && { DocumentDate: documentDate }),
                ...(modified != null && { Modified: modified })
            };
        });

        let nextCursor: string | undefined;
        if (docsData.d?.__next) {
            const nextUrl = new URL(docsData.d.__next);
            nextCursor = nextUrl.searchParams.get('$skiptoken') ?? undefined;
        }

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
