import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor ($skip value) from the previous response. Omit for the first page.')
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z
                .object({
                    CurrentDivision: z.number()
                })
                .passthrough()
        )
    })
});

const JournalsResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z
                .object({
                    ID: z.string(),
                    Code: z.string(),
                    Description: z.string().optional(),
                    Modified: z.string().optional()
                })
                .passthrough()
        ),
        __next: z.string().optional()
    })
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            code: z.string(),
            description: z.string().optional(),
            modified: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List financial journals',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-journals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input) => {
        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-faq-rest-api
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const divisionResult = meData.d.results[0];
        if (!divisionResult) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Unable to determine current division from Me endpoint'
            });
        }
        const division = divisionResult.CurrentDivision;

        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a numeric skip value'
            });
        }

        const params: Record<string, string> = {
            $select: 'ID,Code,Description,Modified',
            $orderby: 'Modified asc',
            $top: '100'
        };
        if (skip > 0) {
            params['$skip'] = String(skip);
        }

        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-restintro
        const journalsResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/financial/Journals`,
            params,
            retries: 3
        });

        const journalsData = JournalsResponseSchema.parse(journalsResponse.data);
        const items = journalsData.d.results.map((journal) => ({
            id: journal.ID,
            code: journal.Code,
            ...(journal.Description !== undefined && { description: journal.Description }),
            ...(journal.Modified !== undefined && { modified: journal.Modified })
        }));

        let nextCursor: string | undefined;
        if (journalsData.d.__next) {
            const nextUrl = new URL(journalsData.d.__next);
            const nextSkip = nextUrl.searchParams.get('$skip');
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
