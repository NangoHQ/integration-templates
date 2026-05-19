import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.number().optional().describe('Start date in milliseconds since epoch to filter time entries'),
    end_date: z.number().optional().describe('End date in milliseconds since epoch to filter time entries'),
    assignee: z.number().optional().describe('User ID to filter time entries by assignee'),
    include_task_tags: z.boolean().optional().describe('Include task tags in the response'),
    include_location_names: z.boolean().optional().describe('Include location names in the response'),
    space_id: z.number().optional().describe('Space ID to filter time entries'),
    folder_id: z.number().optional().describe('Folder ID to filter time entries'),
    list_id: z.number().optional().describe('List ID to filter time entries'),
    task_id: z.string().optional().describe('Task ID to filter time entries')
});

const UserSchema = z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    color: z.string().optional(),
    profile_picture: z.string().optional(),
    initials: z.string().optional()
});

const TaskLocationSchema = z.object({
    list_id: z.number(),
    folder_id: z.number().nullable(),
    space_id: z.number()
});

const TimeEntrySchema = z.object({
    id: z.string(),
    task: z
        .object({
            id: z.string(),
            name: z.string(),
            status: z.string().optional(),
            task_url: z.string().optional()
        })
        .nullable(),
    user: UserSchema,
    billable: z.boolean(),
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    description: z.string().optional(),
    tags: z.array(z.object({ name: z.string() }).passthrough()).optional(),
    source: z.string().optional(),
    task_location: TaskLocationSchema.optional(),
    workspace_id: z.number()
});

const ProviderResponseSchema = z.object({
    data: z.array(TimeEntrySchema)
});

const OutputSchema = z.object({
    data: z.array(TimeEntrySchema)
});

const action = createAction({
    description: 'List time entries from ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-time-entries',
        group: 'Time Tracking'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ team_id?: number }>();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'team_id is required in metadata.'
            });
        }

        const params: Record<string, string | number> = {};

        if (input['start_date'] !== undefined) {
            params['start_date'] = input['start_date'];
        }
        if (input['end_date'] !== undefined) {
            params['end_date'] = input['end_date'];
        }
        if (input.assignee !== undefined) {
            params['assignee'] = input.assignee;
        }
        if (input['include_task_tags'] !== undefined) {
            params['include_task_tags'] = input['include_task_tags'] ? 'true' : 'false';
        }
        if (input['include_location_names'] !== undefined) {
            params['include_location_names'] = input['include_location_names'] ? 'true' : 'false';
        }
        if (input['space_id'] !== undefined) {
            params['space_id'] = input['space_id'];
        }
        if (input['folder_id'] !== undefined) {
            params['folder_id'] = input['folder_id'];
        }
        if (input['list_id'] !== undefined) {
            params['list_id'] = input['list_id'];
        }
        if (input.task_id !== undefined) {
            params['task_id'] = input.task_id;
        }

        // https://developer.clickup.com/reference/gettimeentrieswithinteam
        const response = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/time_entries`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            data: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
