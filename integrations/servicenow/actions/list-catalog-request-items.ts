import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    request_sys_id: z.string().describe('The sys_id of the catalog request (sc_request). Example: "a8d6cbf9c3ca0310c5a8fc0d050131f5"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ScReqItemSchema = z
    .object({
        sys_id: z.string(),
        number: z.string().optional(),
        request: z.string().optional(),
        cat_item: z.string().optional(),
        short_description: z.string().optional(),
        description: z.string().optional(),
        state: z.string().optional(),
        stage: z.string().optional(),
        price: z.string().optional(),
        quantity: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional(),
        opened_by: z.string().optional(),
        assigned_to: z.string().optional(),
        due_date: z.string().optional(),
        approval: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ScReqItemSchema),
    next_cursor: z.string().optional()
});

function extractNextOffset(linkHeader: string): string | undefined {
    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match && match[1]) {
            const offsetMatch = match[1].match(/[?&]sysparm_offset=([^&]+)/);
            if (offsetMatch && offsetMatch[1]) {
                return decodeURIComponent(offsetMatch[1]);
            }
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List request items (sc_req_item) for a catalog request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            sysparm_query: `request=${encodeURIComponent(input.request_sys_id)}`,
            sysparm_limit: 100,
            sysparm_exclude_reference_link: 'true'
        };

        if (input.cursor !== undefined) {
            if (!/^\d+$/.test(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            const offset = Number(input.cursor);
            if (!Number.isSafeInteger(offset)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            params['sysparm_offset'] = offset;
        }

        // https://developer.servicenow.com/dev.do#!/reference/api/now/table/sc_req_item
        const response = await nango.get({
            endpoint: '/api/now/table/sc_req_item',
            params,
            retries: 3
        });

        const result = z
            .object({
                result: z.array(z.unknown())
            })
            .parse(response.data);

        const items = result.result.map((item: unknown) => ScReqItemSchema.parse(item));

        let next_cursor: string | undefined;
        const linkHeader = response.headers?.['link'] || response.headers?.['Link'];
        if (typeof linkHeader === 'string') {
            next_cursor = extractNextOffset(linkHeader);
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
