import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project ID (bucket ID) containing the to-do list.'),
        todoListId: z.number().describe('The to-do list ID whose groups should be listed.'),
        status: z.enum(['archived', 'trashed']).optional().describe('Filter by status. Omit for active groups only.')
    })
    .describe('Input for listing the sub-groups within a Basecamp to-do list.');

const GroupSchema = z.object({
    id: z.number().describe('Unique identifier for the to-do list group.'),
    status: z.string().describe('Current status of the group, e.g. "active", "archived", or "trashed".'),
    visible_to_clients: z.boolean().describe('Whether the group is visible to clients.'),
    created_at: z.string().describe('ISO 8601 timestamp when the group was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the group was last updated.'),
    title: z.string().describe('Display title of the group.'),
    position: z.number().describe('Position of the group within the parent to-do list.'),
    completed: z.boolean().describe('Whether all to-dos in the group are completed.'),
    completed_ratio: z.string().describe('Ratio of completed to-dos, e.g. "0/2".'),
    name: z.string().describe('Name of the group.'),
    type: z.string().describe('The resource type, always "Todolist" for groups.'),
    url: z.string().describe('API URL for the group.'),
    app_url: z.string().describe('Basecamp web app URL for the group.'),
    todos_url: z.string().describe('API URL to list the to-dos within this group.')
});

const OutputSchema = z
    .object({
        groups: z.array(GroupSchema).describe('The to-do list groups found within the specified to-do list.')
    })
    .describe('Output containing the sub-groups within a Basecamp to-do list.');

/**
 * @tags: [read]
 * @tagReason: Only reads existing to-do list groups from the provider.
 * @pitfalls: Groups are structurally identical to regular to-do lists and share `type: 'Todolist'`, so they cannot be distinguished from top-level lists by inspecting the returned fields alone.
 */
const action = createAction({
    description: 'List the sub-groups (sections) within a to-do list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.status !== undefined) {
            params['status'] = input.status;
        }

        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/todolist_groups.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todolists/${encodeURIComponent(input.todoListId)}/groups.json`,
            params,
            retries: 3
        });

        const parsed = z.array(z.unknown()).parse(response.data);
        const groups = parsed.map((item) => GroupSchema.parse(item));

        return {
            groups
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
