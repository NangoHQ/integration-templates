import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_gid: z.string().min(1).describe('Globally unique identifier for the project. Example: "1200000000000001"'),
    completed_since: z
        .string()
        .optional()
        .describe('Only return tasks that are either incomplete or that have been completed since this time. Accepts a date-time string or the keyword "now".'),
    limit: z.number().int().min(1).max(100).optional().describe('Results per page. The value must be between 1 and 100. Defaults to 100.'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.')
});

const TaskSchema = z.object({
    gid: z.string(),
    name: z.string(),
    resource_type: z.string().optional(),
    assignee: z
        .object({
            gid: z.string().optional(),
            name: z.string().optional(),
            resource_type: z.string().optional()
        })
        .nullable()
        .optional(),
    completed: z.boolean().optional(),
    due_on: z.string().nullable().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    notes: z.string().optional(),
    permalink_url: z.string().optional()
});

const OutputSchema = z.object({
    tasks: z.array(TaskSchema),
    next_offset: z.string().optional().describe('Offset token for the next page of results. Omitted if there are no more pages.')
});

const ProviderNextPageSchema = z.object({
    offset: z.string().optional(),
    path: z.string().optional(),
    uri: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: ProviderNextPageSchema.nullable().optional()
});

const action = createAction({
    description: 'List tasks in a project.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-tasks-for-project',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            limit: String(input.limit ?? 100),
            opt_fields: 'gid,name,resource_type,assignee,completed,due_on,created_at,modified_at,notes,permalink_url'
        };

        if (input.completed_since !== undefined) {
            params['completed_since'] = input.completed_since;
        }

        if (input.cursor !== undefined && input.cursor !== '') {
            params['offset'] = input.cursor;
        }

        const config = {
            // https://developers.asana.com/reference/gettasksforproject
            endpoint: `/api/1.0/projects/${encodeURIComponent(input.project_gid)}/tasks`,
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const tasks = providerResponse.data.map((item) => {
            return TaskSchema.parse(item);
        });

        return {
            tasks,
            ...(providerResponse.next_page != null && providerResponse.next_page.offset != null && providerResponse.next_page.offset !== ''
                ? { next_offset: providerResponse.next_page.offset }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
