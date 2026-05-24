import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('List ID to fetch tasks from. Example: "901523451693"'),
    archived: z.boolean().optional().describe('Include archived tasks. Default: false'),
    page: z.number().optional().describe('Page number (0-based). Omit for first page'),
    order_by: z.enum(['id', 'created', 'updated', 'due_date']).optional().describe('Field to order by'),
    reverse: z.boolean().optional().describe('Reverse order. Default: false'),
    subtasks: z.boolean().optional().describe('Include subtasks. Default: false'),
    statuses: z.array(z.string()).optional().describe('Filter by status names'),
    assignees: z.array(z.string()).optional().describe('Filter by assignee user IDs'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    due_date_gt: z.number().optional().describe('Filter by due date greater than (ms epoch)'),
    due_date_lt: z.number().optional().describe('Filter by due date less than (ms epoch)'),
    date_created_gt: z.number().optional().describe('Filter by date created greater than (ms epoch)'),
    date_created_lt: z.number().optional().describe('Filter by date created less than (ms epoch)'),
    date_updated_gt: z.number().optional().describe('Filter by date updated greater than (ms epoch)'),
    date_updated_lt: z.number().optional().describe('Filter by date updated less than (ms epoch)')
});

const TaskSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    text_content: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z
        .object({
            status: z.string().optional(),
            color: z.string().optional()
        })
        .optional(),
    orderindex: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    date_closed: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    creator: z
        .object({
            id: z.number().optional(),
            username: z.string().optional(),
            color: z.string().optional(),
            email: z.string().optional(),
            profile_picture: z.string().nullable().optional()
        })
        .optional(),
    assignees: z
        .array(
            z.object({
                id: z.number().optional(),
                username: z.string().optional(),
                color: z.string().optional(),
                email: z.string().optional(),
                profile_picture: z.string().nullable().optional()
            })
        )
        .optional(),
    watchers: z
        .array(
            z.object({
                id: z.number().optional(),
                username: z.string().optional(),
                color: z.string().optional(),
                email: z.string().optional(),
                profile_picture: z.string().nullable().optional()
            })
        )
        .optional(),
    tags: z
        .array(
            z.object({
                name: z.string().optional(),
                tag_fg: z.string().optional(),
                tag_bg: z.string().optional()
            })
        )
        .optional(),
    parent: z.string().nullable().optional(),
    priority: z
        .object({
            priority: z.string().optional(),
            color: z.string().optional()
        })
        .nullable()
        .optional(),
    due_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    folder: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
        })
        .optional(),
    space: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            access: z.boolean().optional()
        })
        .optional(),
    list: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            access: z.boolean().optional()
        })
        .optional(),
    url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    tasks: z.array(TaskSchema),
    last_page: z.boolean()
});

const OutputSchema = z.object({
    tasks: z.array(TaskSchema),
    last_page: z.boolean()
});

const action = createAction({
    description: 'List tasks from a ClickUp list with optional filtering and pagination',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-tasks',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {};

        if (input.archived !== undefined) {
            params['archived'] = input.archived.toString();
        }
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.order_by !== undefined) {
            params['order_by'] = input.order_by;
        }
        if (input.reverse !== undefined) {
            params['reverse'] = input.reverse.toString();
        }
        if (input.subtasks !== undefined) {
            params['subtasks'] = input.subtasks.toString();
        }
        if (input.statuses !== undefined && input.statuses.length > 0) {
            params['statuses'] = input.statuses;
        }
        if (input.assignees !== undefined && input.assignees.length > 0) {
            params['assignees'] = input.assignees;
        }
        if (input.tags !== undefined && input.tags.length > 0) {
            params['tags'] = input.tags;
        }
        if (input.due_date_gt !== undefined) {
            params['due_date_gt'] = input.due_date_gt;
        }
        if (input.due_date_lt !== undefined) {
            params['due_date_lt'] = input.due_date_lt;
        }
        if (input.date_created_gt !== undefined) {
            params['date_created_gt'] = input.date_created_gt;
        }
        if (input.date_created_lt !== undefined) {
            params['date_created_lt'] = input.date_created_lt;
        }
        if (input.date_updated_gt !== undefined) {
            params['date_updated_gt'] = input.date_updated_gt;
        }
        if (input.date_updated_lt !== undefined) {
            params['date_updated_lt'] = input.date_updated_lt;
        }

        // https://developer.clickup.com/reference/gettasks
        const response = await nango.get({
            endpoint: `/api/v2/list/${encodeURIComponent(input.list_id)}/task`,
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            tasks: providerData.tasks,
            last_page: providerData.last_page
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
