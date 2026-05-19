import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    timer_id: z.string().describe('The ID of the time entry to update. Example: "5090290025624291206"'),
    description: z.string().optional().describe('The description of the time entry.'),
    start: z.number().optional().describe('The start time in Unix epoch milliseconds.'),
    duration: z.number().optional().describe('Duration in milliseconds.'),
    billable: z.boolean().optional().describe('Whether the time entry is billable.'),
    tid: z.string().optional().describe('Task ID to associate the time entry with.'),
    tags: z.array(z.string()).optional().describe('List of tag names to apply to the time entry.')
});

const ProviderTimeEntrySchema = z.object({
    id: z.string(),
    task: z.object({ id: z.string(), name: z.string() }).optional(),
    user: z.object({ id: z.number(), username: z.string() }).optional(),
    description: z.string(),
    start: z.union([z.number(), z.string()]).transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
    end: z.union([z.number(), z.string()]).transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
    duration: z.union([z.number(), z.string()]).transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
    billable: z.boolean(),
    tags: z.array(z.object({ name: z.string() })).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTimeEntrySchema)
});

const OutputSchema = z.object({
    id: z.string(),
    task_id: z.string().optional(),
    task_name: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    description: z.string(),
    start: z.number(),
    end: z.number(),
    duration: z.number(),
    billable: z.boolean(),
    tags: z.array(z.string())
});

const action = createAction({
    description: 'Update a time entry in ClickUp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-time-entry',
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
                message: 'team_id is required in metadata.'
            });
        }
        const timerId = encodeURIComponent(input.timer_id);

        const requestBody: Record<string, unknown> = {};
        if (input.description !== undefined) {
            requestBody['description'] = input.description;
        }
        if (input.start !== undefined) {
            requestBody['start'] = input.start;
        }
        if (input.duration !== undefined) {
            requestBody['duration'] = input.duration;
        }
        if (input.billable !== undefined) {
            requestBody['billable'] = input.billable;
        }
        if (input.tid !== undefined) {
            requestBody['tid'] = input.tid;
        }
        if (input.tags !== undefined) {
            requestBody['tags'] = input.tags;
        }

        const response = await nango.put({
            // https://developer.clickup.com/reference/updatetimeentry
            endpoint: `/api/v2/team/${teamId}/time_entries/${timerId}`,
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const firstEntry = parsed.data[0];
        if (!firstEntry) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Time entry not found or could not be updated',
                timer_id: input.timer_id
            });
        }

        return {
            id: firstEntry.id,
            ...(firstEntry.task?.id && { task_id: firstEntry.task.id }),
            ...(firstEntry.task?.name && { task_name: firstEntry.task.name }),
            ...(firstEntry.user?.id && { user_id: firstEntry.user.id.toString() }),
            ...(firstEntry.user?.username && { user_name: firstEntry.user.username }),
            description: firstEntry.description,
            start: firstEntry.start,
            end: firstEntry.end,
            duration: firstEntry.duration,
            billable: firstEntry.billable,
            tags: firstEntry.tags?.map((tag) => tag.name) || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
