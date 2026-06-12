import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    workspace_gid: z.string().min(1).describe('Globally unique identifier for the workspace or organization. Example: "1202775892569436"'),
    assignee: z.string().optional().describe('Comma-separated list of user identifiers, or "me". Example: "me"'),
    project: z.string().optional().describe('Comma-separated list of project IDs. Example: "1211440849237745"'),
    section: z.string().optional().describe('Comma-separated list of section or column IDs. Example: "12345"'),
    completed: z.boolean().optional().describe('Filter to completed tasks.'),
    modified_since: z.string().optional().describe('Only return tasks modified since the given ISO 8601 datetime. Example: "2024-01-01T00:00:00.000Z"'),
    sort_by: z.enum(['due_date', 'created_at', 'completed_at', 'likes', 'modified_at']).optional().describe('Sort field. Defaults to modified_at.'),
    sort_ascending: z.boolean().optional().describe('Sort ascending. Defaults to false.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of tasks to return (max 100).'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Omit for the first page.')
});

const AsanaTaskSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional(),
    completed: z.boolean().optional(),
    assignee: z
        .object({
            gid: z.string().optional(),
            name: z.string().optional()
        })
        .nullable()
        .optional(),
    projects: z
        .array(
            z.object({
                gid: z.string().optional(),
                name: z.string().optional()
            })
        )
        .optional(),
    sections: z
        .array(
            z.object({
                gid: z.string().optional(),
                name: z.string().optional()
            })
        )
        .optional(),
    modified_at: z.string().optional(),
    created_at: z.string().optional(),
    due_on: z.string().nullable().optional(),
    notes: z.string().optional()
});

const OutputSchema = z.object({
    tasks: z.array(AsanaTaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'Search tasks in a workspace with filters.',
    version: '1.0.1',
    endpoint: {
        method: 'GET',
        path: '/actions/search-tasks-in-workspace',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            opt_fields:
                'gid,name,resource_type,completed,assignee.gid,assignee.name,projects.gid,projects.name,sections.gid,sections.name,modified_at,created_at,due_on,notes'
        };

        if (input.assignee !== undefined) {
            params['assignee.any'] = input.assignee;
        }
        if (input.project !== undefined) {
            params['projects.any'] = input.project;
        }
        if (input.section !== undefined) {
            params['sections.any'] = input.section;
        }
        if (input.completed !== undefined) {
            params['completed'] = input.completed ? 'true' : 'false';
        }
        if (input.modified_since !== undefined) {
            params['modified_at.after'] = input.modified_since;
        }
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_ascending !== undefined) {
            params['sort_ascending'] = input.sort_ascending ? 'true' : 'false';
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        const config: ProxyConfiguration = {
            // https://developers.asana.com/reference/searchtasksforworkspace
            endpoint: `/workspaces/${encodeURIComponent(input.workspace_gid)}/tasks/search`,
            params,
            retries: 3,
            baseUrlOverride: 'https://app.asana.com/api/1.0'
        };

        let response;
        try {
            response = await nango.get(config);
        } catch (error: any) {
            if (error?.response?.status === 402) {
                throw new nango.ActionError({
                    type: 'premium_required',
                    message: 'Search is only available to premium Asana users.'
                });
            }
            throw error;
        }

        const SearchResponseSchema = z.object({
            data: z.array(z.unknown()).optional(),
            next_page: z
                .object({
                    offset: z.string().optional()
                })
                .nullable()
                .optional()
        });

        const parsed = SearchResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Asana API.',
                details: parsed.error.format()
            });
        }

        const rawTasks = parsed.data.data ?? [];
        const tasks = rawTasks.map((item) => {
            const taskParsed = AsanaTaskSchema.safeParse(item);
            if (!taskParsed.success) {
                throw new nango.ActionError({
                    type: 'schema_mismatch',
                    message: 'Task schema mismatch.',
                    details: taskParsed.error.format()
                });
            }
            return taskParsed.data;
        });

        const result: z.infer<typeof OutputSchema> = { tasks };
        const nextCursor = parsed.data.next_page?.offset;
        if (nextCursor !== undefined) {
            result.next_cursor = nextCursor;
        }
        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
