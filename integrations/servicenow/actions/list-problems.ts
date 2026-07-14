import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of records to return per page. Default: 25.'),
    query: z.string().optional().describe('Encoded query string for filtering results (sysparm_query).'),
    fields: z.array(z.string()).optional().describe('Fields to return (sysparm_fields).')
});

const ProblemSchema = z
    .object({
        sys_id: z.string().optional(),
        number: z.string().optional(),
        short_description: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        impact: z.string().nullable().optional(),
        urgency: z.string().nullable().optional(),
        priority: z.string().nullable().optional(),
        assigned_to: z.unknown().optional(),
        assignment_group: z.unknown().optional(),
        opened_by: z.unknown().optional(),
        opened_at: z.string().nullable().optional(),
        sys_created_on: z.string().nullable().optional(),
        sys_updated_on: z.string().nullable().optional(),
        resolved_by: z.unknown().optional(),
        resolved_at: z.string().nullable().optional(),
        close_code: z.string().nullable().optional(),
        close_notes: z.string().nullable().optional(),
        work_notes: z.string().nullable().optional(),
        comments: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    problems: z.array(ProblemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List problems.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        let offset = 0;
        if (input.cursor !== undefined) {
            const parsed = Number(input.cursor);
            if (!Number.isInteger(parsed) || parsed < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            offset = parsed;
        }

        const limit = input.limit ?? 25;

        const params: Record<string, string | number> = {
            sysparm_limit: limit,
            sysparm_offset: offset
        };

        if (input.query !== undefined) {
            params['sysparm_query'] = input.query;
        }

        if (input.fields !== undefined && input.fields.length > 0) {
            params['sysparm_fields'] = input.fields.join(',');
        }

        const response = await nango.get({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/problem
            endpoint: '/api/now/table/problem',
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            result: z.array(ProblemSchema)
        });

        const data = ProviderResponseSchema.parse(response.data);
        const problems = data.result;

        const linkHeader = response.headers?.['link'] ?? response.headers?.['Link'];
        const hasNext = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

        const nextOffset = offset + limit;

        return {
            problems,
            ...(hasNext && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
