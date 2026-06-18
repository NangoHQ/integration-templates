import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('ClickUp Workspace/Team ID. Example: "90152560096"'),
    description: z.string().optional().describe('Description of the time entry'),
    start: z.number().describe('Start time in milliseconds since Unix epoch'),
    duration: z.number().describe('Duration in milliseconds'),
    task_id: z.string().optional().describe('Task ID to associate with the time entry. Example: "abc123"'),
    billable: z.boolean().optional().describe('Whether the time entry is billable'),
    tags: z
        .array(
            z.object({
                name: z.string(),
                tag_fg: z.string().optional(),
                tag_bg: z.string().optional()
            })
        )
        .optional()
        .describe('Tags to associate with the time entry')
});

const ProviderTaskSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        status: z
            .object({
                status: z.string().optional(),
                color: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const ProviderTimeEntrySchema = z
    .object({
        id: z.string(),
        task: ProviderTaskSchema.nullable().optional(),
        wid: z.string().optional(),
        user: z
            .object({
                id: z.number().optional(),
                username: z.string().optional(),
                email: z.string().optional()
            })
            .passthrough()
            .optional(),
        billable: z.boolean().optional(),
        start: z.number().optional(),
        end: z.union([z.number(), z.string()]).optional(),
        duration: z.number().optional(),
        description: z.string().nullable().optional(),
        tags: z
            .array(
                z.object({
                    name: z.string(),
                    tag_fg: z.string().optional(),
                    tag_bg: z.string().optional()
                })
            )
            .optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: ProviderTimeEntrySchema
});

const OutputSchema = z.object({
    id: z.string().describe('Time entry ID'),
    task: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    workspace_id: z.string().optional(),
    user: z
        .object({
            id: z.number().optional(),
            username: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    billable: z.boolean().optional(),
    start: z.number().optional(),
    end: z.union([z.number(), z.string()]).optional(),
    duration: z.number().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Create a time entry in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/createatimeentry
        const response = await nango.post({
            endpoint: `/api/v2/team/${encodeURIComponent(input.team_id)}/time_entries`,
            data: {
                description: input.description,
                start: input.start,
                duration: input.duration,
                ...(input.task_id !== undefined && { tid: input.task_id }),
                ...(input.billable !== undefined && { billable: input.billable }),
                ...(input.tags !== undefined && { tags: input.tags })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const entry = providerResponse.data;

        return {
            id: entry.id,
            ...(entry.task !== null &&
                entry.task !== undefined && {
                    task: {
                        id: entry.task.id,
                        name: entry.task.name
                    }
                }),
            ...(entry.wid !== undefined && { workspace_id: entry.wid }),
            ...(entry.user !== undefined && {
                user: {
                    id: entry.user.id,
                    username: entry.user.username,
                    email: entry.user.email
                }
            }),
            ...(entry.billable !== undefined && { billable: entry.billable }),
            ...(entry.start !== undefined && { start: entry.start }),
            ...(entry.end !== undefined && { end: entry.end }),
            ...(entry.duration !== undefined && { duration: entry.duration }),
            ...(entry.description !== null &&
                entry.description !== undefined && {
                    description: entry.description
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
