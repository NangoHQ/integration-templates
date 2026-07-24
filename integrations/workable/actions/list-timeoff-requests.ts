import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from_date: z.string().describe('Start date filter. Example: "2026-01-01"'),
    to_date: z.string().optional().describe('End date filter. Example: "2026-12-31"'),
    category_ids: z.array(z.string()).optional().describe('Category IDs to filter by. Example: ["10013"]'),
    states: z.array(z.string()).optional().describe('States to filter by. Example: ["pending", "approved"]'),
    employee_id: z.string().optional().describe('Filter by a single employee ID. Example: "19ff54"'),
    employee_ids: z.array(z.string()).optional().describe('Filter by multiple employee IDs. Example: ["19ff54", "19ff7e"]'),
    limit: z
        .union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)])
        .optional()
        .describe('Page size. Must be 10, 20, 50, or 100.'),
    offset: z.number().int().optional().describe('Pagination offset.')
});

const TimeoffRequestSchema = z
    .object({
        id: z.string(),
        employee_id: z.string(),
        state: z.string(),
        category_id: z.string().optional(),
        category_name: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        from_date: z.string().optional(),
        to_date: z.string().optional(),
        days: z.number().optional(),
        requesting_total: z.number().optional(),
        timeoff_tracking_unit: z.string().optional(),
        reason: z.string().optional(),
        comments: z.string().optional(),
        pending_approvals: z
            .array(
                z
                    .object({
                        id: z.string().optional(),
                        approver_id: z.string().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    requests: z.array(TimeoffRequestSchema),
    total_count: z.number(),
    limit: z.number(),
    offset: z.number(),
    next_offset: z.number().optional()
});

const action = createAction({
    description: 'List time-off requests with date, state, and employee filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_timeoff'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {
            from_date: input.from_date
        };

        if (input.to_date !== undefined) {
            params['to_date'] = input.to_date;
        }

        if (input.employee_id !== undefined) {
            params['employee_id'] = input.employee_id;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }

        if (input.category_ids !== undefined && input.category_ids.length > 0) {
            params['category_ids'] = input.category_ids;
        }

        if (input.states !== undefined && input.states.length > 0) {
            params['states'] = input.states;
        }

        if (input.employee_ids !== undefined && input.employee_ids.length > 0) {
            params['employee_ids'] = input.employee_ids;
        }

        const response = await nango.get({
            // https://workable.readme.io/reference/list-timeoff-requests
            endpoint: '/spi/v3/timeoff/requests',
            params,
            retries: 3
        });

        const rawData = z
            .object({
                requests: z.array(z.unknown()),
                total_count: z.number(),
                limit: z.number().optional(),
                offset: z.number().optional()
            })
            .parse(response.data);

        const requests = rawData.requests.map((item: unknown) => TimeoffRequestSchema.parse(item));

        const responseOffset = rawData.offset ?? input.offset ?? 0;
        // Workable does not always echo back `limit` (its unbounded default page size is 10, not 50),
        // so advance by the number of records actually returned rather than a fallback limit value,
        // otherwise offsets between the true page size and the fallback would be silently skipped.
        const nextOffset = responseOffset + requests.length;
        const hasMore = nextOffset < rawData.total_count;

        return {
            requests,
            total_count: rawData.total_count,
            limit: rawData.limit ?? input.limit ?? requests.length,
            offset: responseOffset,
            ...(hasMore && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
