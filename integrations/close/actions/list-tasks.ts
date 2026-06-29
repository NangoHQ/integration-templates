import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().optional().describe('Lead ID to filter tasks by. Example: "lead_xxx"'),
    assigned_to: z.string().optional().describe('User ID to filter tasks by assignee. Example: "user_xxx"'),
    is_complete: z.boolean().optional().describe('Filter by completion status.'),
    type: z.string().optional().describe('Task type to filter by. Example: "lead" or "opportunity"'),
    view: z.string().optional().describe('Task view to filter by. Example: "inbox", "future", or "archive"'),
    date_updated__gt: z.string().optional().describe('Filter by update time greater than ISO8601 timestamp. Example: "2024-01-01T00:00:00.000000+00:00"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of results to return. Max 200.')
});

const TaskSchema = z
    .object({
        id: z.string(),
        _type: z.string(),
        view: z.string(),
        assigned_to: z.string().optional(),
        assigned_to_name: z.string().optional(),
        contact_id: z.string().nullable().optional(),
        contact_name: z.string().nullable().optional(),
        created_by: z.string().nullable().optional(),
        created_by_name: z.string().nullable().optional(),
        date: z.string().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        is_complete: z.boolean().optional(),
        is_dateless: z.boolean().optional(),
        lead_id: z.string().nullable().optional(),
        lead_name: z.string().nullable().optional(),
        object_id: z.string().nullable().optional(),
        object_type: z.string().nullable().optional(),
        organization_id: z.string().optional(),
        text: z.string().nullable().optional(),
        updated_by: z.string().nullable().optional(),
        updated_by_name: z.string().nullable().optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    tasks: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tasks with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const skip = input.cursor ? Number(input.cursor) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric string.'
            });
        }

        const limit = input.limit ?? 100;
        if (limit > 200) {
            throw new nango.ActionError({
                type: 'invalid_limit',
                message: 'limit cannot exceed 200.'
            });
        }

        const params: Record<string, string | number> = {
            _skip: skip,
            _limit: limit
        };

        if (input.lead_id !== undefined) {
            params['lead_id'] = input.lead_id;
        }
        if (input.assigned_to !== undefined) {
            params['assigned_to'] = input.assigned_to;
        }
        if (input.is_complete !== undefined) {
            params['is_complete'] = input.is_complete ? 'true' : 'false';
        }
        if (input.type !== undefined) {
            params['_type'] = input.type;
        }
        if (input.view !== undefined) {
            params['view'] = input.view;
        }
        if (input.date_updated__gt !== undefined) {
            params['date_updated__gt'] = input.date_updated__gt;
        }

        // https://developer.close.com/api/resources/tasks/list
        const response = await nango.get({
            endpoint: '/v1/task/',
            params,
            retries: 3
        });

        const listResponse = z
            .object({
                data: z.array(z.unknown()),
                has_more: z.boolean()
            })
            .parse(response.data);

        const tasks = listResponse.data.map((item) => {
            const parsed = TaskSchema.parse(item);
            return parsed;
        });

        const nextCursor = listResponse.has_more ? String(skip + limit) : undefined;

        return {
            tasks,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
