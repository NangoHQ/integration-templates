import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pageSize: z.number().min(1).max(100).optional().describe('Number of results per page. Defaults to 20.')
});

const RecordPropertySchema = z.object({
    type: z.string(),
    value: z.unknown()
});

const RecordSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        name: z.string().optional(),
        properties: z.record(z.string(), RecordPropertySchema).optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(RecordSchema),
    nextCursor: z.string().optional()
});

const ListResponseSchema = z.union([
    z.array(z.unknown()),
    z.object({
        list: z.array(z.unknown()),
        count: z.number().optional(),
        pageSize: z.number().optional()
    })
]);

const action = createAction({
    description: 'List contract records',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['public.records.readRecords'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        let page = 0;
        if (input.cursor !== undefined) {
            if (input.cursor.trim() === '') {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a valid non-negative page number'
                });
            }
            const parsedPage = Number(input.cursor);
            if (!Number.isInteger(parsedPage) || parsedPage < 0) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a valid non-negative page number'
                });
            }
            page = parsedPage;
        }

        // https://developer.ironcladapp.com/reference/list-all-records
        const response = await nango.get({
            endpoint: '/public/api/v1/records',
            params: {
                page: String(page),
                ...(input.pageSize !== undefined && { pageSize: String(input.pageSize) })
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from list records endpoint'
            });
        }

        const parsedResponse = ListResponseSchema.safeParse(rawData);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse list records response',
                details: parsedResponse.error.message
            });
        }

        const rawItems = Array.isArray(parsedResponse.data) ? parsedResponse.data : parsedResponse.data.list;
        if (!Array.isArray(rawItems)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected array of records in response'
            });
        }

        const items = rawItems.map((item: unknown) => {
            const parsed = RecordSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_record',
                    message: 'Failed to parse record from list response',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        let hasMore = false;
        if (Array.isArray(parsedResponse.data)) {
            hasMore = items.length === (input.pageSize ?? 20);
        } else if (parsedResponse.data.count !== undefined) {
            const pageSize = parsedResponse.data.pageSize ?? input.pageSize ?? 20;
            hasMore = parsedResponse.data.count > (page + 1) * pageSize;
        }

        return {
            items,
            ...(hasMore && { nextCursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
