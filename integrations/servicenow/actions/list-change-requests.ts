import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (sysparm_offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of records to return per page. Defaults to 10.'),
    query: z.string().optional().describe('Encoded query string for filtering results (sysparm_query).')
});

const ChangeRequestSchema = z
    .object({
        sys_id: z.string(),
        number: z.string().optional(),
        short_description: z.string().optional(),
        description: z.string().optional(),
        state: z.string().optional(),
        priority: z.string().optional(),
        impact: z.string().optional(),
        urgency: z.string().optional(),
        category: z.string().optional(),
        risk: z.string().optional(),
        type: z.string().optional(),
        approval: z.string().optional(),
        requested_by: z.unknown().optional(),
        opened_by: z.unknown().optional(),
        assigned_to: z.unknown().optional(),
        assignment_group: z.unknown().optional(),
        cmdb_ci: z.unknown().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional(),
        sys_created_by: z.string().optional(),
        sys_updated_by: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ChangeRequestSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List change requests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 10;

        let offset = 0;
        if (input.cursor !== undefined) {
            if (!/^\d+$/.test(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            offset = Number(input.cursor);
            if (!Number.isSafeInteger(offset)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
        }

        const params: Record<string, string> = {
            sysparm_limit: String(limit),
            sysparm_offset: String(offset)
        };

        if (input.query !== undefined) {
            params['sysparm_query'] = input.query;
        }

        const config: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/change_request
            endpoint: '/api/now/table/change_request',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const providerSchema = z.object({
            result: z.array(z.unknown())
        });

        const parsed = providerSchema.parse(response.data);

        const items = parsed.result.map((item) => ChangeRequestSchema.parse(item));

        let next_cursor: string | undefined;
        const linkHeader = response.headers?.['link'] || response.headers?.['Link'];
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                const nextUrl = nextMatch[1];
                const url = new URL(nextUrl, 'http://localhost');
                const nextOffset = url.searchParams.get('sysparm_offset');
                if (nextOffset) {
                    next_cursor = nextOffset;
                }
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
