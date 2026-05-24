import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    time_entry_id: z.string().describe('The ID of the time entry to retrieve. Example: "5090290025624291206"')
});

const TaskLocationSchema = z.object({
    list_id: z.string().nullable(),
    folder_id: z.string().nullable(),
    space_id: z.string().nullable()
});

const TaskSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.object({
        status: z.string(),
        color: z.string(),
        orderindex: z.number(),
        type: z.string()
    })
});

const TagSchema = z.object({
    name: z.string(),
    tag_fg: z.string(),
    tag_bg: z.string(),
    creator: z.number()
});

const TimeEntryDataSchema = z.object({
    id: z.string(),
    task: TaskSchema.optional().nullable(),
    wid: z.string().optional(),
    user: z.object({
        id: z.number(),
        username: z.string().optional(),
        email: z.string().optional(),
        color: z.string().optional(),
        initials: z.string().optional(),
        profilePicture: z.string().nullable().optional()
    }),
    billable: z.boolean(),
    start: z.string().optional(),
    end: z.string().optional(),
    duration: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(TagSchema).optional(),
    source: z.string().optional(),
    task_location: TaskLocationSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    task: z
        .object({
            id: z.string(),
            name: z.string(),
            status: z.string()
        })
        .optional(),
    workspace_id: z.string().optional(),
    user: z.object({
        id: z.number(),
        username: z.string().optional(),
        email: z.string().optional()
    }),
    billable: z.boolean(),
    start: z.string().optional(),
    end: z.string().optional(),
    duration: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    source: z.string().optional(),
    task_location: z
        .object({
            list_id: z.string(),
            folder_id: z.string().nullable(),
            space_id: z.string().nullable()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single time entry from ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-time-entry',
        group: 'Time Tracking'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ team_id?: string }>();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'team_id is required in metadata. Please configure the connection with a team_id.'
            });
        }

        // https://developer.clickup.com/reference/gettimeentry
        const response = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/time_entries/${encodeURIComponent(input.time_entry_id)}`,
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Time entry not found',
                time_entry_id: input.time_entry_id
            });
        }

        const timeEntry = TimeEntryDataSchema.parse(response.data.data);

        return {
            id: timeEntry.id,
            ...(timeEntry.task && {
                task: {
                    id: timeEntry.task.id,
                    name: timeEntry.task.name,
                    status: timeEntry.task.status.status
                }
            }),
            ...(timeEntry.wid && { workspace_id: timeEntry.wid }),
            user: {
                id: timeEntry.user.id,
                ...(timeEntry.user.username && { username: timeEntry.user.username }),
                ...(timeEntry.user.email && { email: timeEntry.user.email })
            },
            billable: timeEntry.billable,
            ...(timeEntry.start && { start: timeEntry.start }),
            ...(timeEntry.end && { end: timeEntry.end }),
            ...(timeEntry.duration && { duration: timeEntry.duration }),
            ...(timeEntry.description && { description: timeEntry.description }),
            ...(timeEntry.tags && {
                tags: timeEntry.tags.map((tag) => tag.name)
            }),
            ...(timeEntry.source && { source: timeEntry.source }),
            ...(timeEntry.task_location &&
                timeEntry.task_location.list_id && {
                    task_location: {
                        list_id: timeEntry.task_location.list_id,
                        folder_id: timeEntry.task_location.folder_id,
                        space_id: timeEntry.task_location.space_id
                    }
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
