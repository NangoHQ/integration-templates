import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Epic name. Example: "Q3 Platform Roadmap"'),
    description: z.string().optional().describe('Epic description.'),
    milestone_id: z.number().optional().describe('Objective (milestone) ID to link the epic to. Example: 14'),
    group_id: z.string().uuid().optional().describe('Team/Group UUID. Example: "6a53bda8-3374-4172-bb50-8bd4efd9e33f"'),
    owner_ids: z.array(z.string().uuid()).optional().describe('Array of member UUIDs to assign as owners.'),
    label_ids: z.array(z.number()).optional().describe('Array of label IDs to attach.'),
    deadline: z.string().optional().describe('Deadline date as ISO-8601 string. Example: "2026-12-31"'),
    planned_start_date: z.string().optional().describe('Planned start date as ISO-8601 string. Example: "2026-07-01"')
});

const ProviderEpicSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    milestone_id: z.number().nullable().optional(),
    group_id: z.string().uuid().nullable().optional(),
    owner_ids: z.array(z.string().uuid()).optional(),
    label_ids: z.array(z.number()).optional(),
    deadline: z.string().nullable().optional(),
    planned_start_date: z.string().nullable().optional(),
    epic_state_id: z.number().optional(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    milestone_id: z.number().optional(),
    group_id: z.string().optional(),
    owner_ids: z.array(z.string().uuid()).optional(),
    label_ids: z.array(z.number()).optional(),
    deadline: z.string().optional(),
    planned_start_date: z.string().optional(),
    epic_state_id: z.number().optional(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create an epic.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            name: string;
            description?: string;
            milestone_id?: number;
            group_id?: string;
            owner_ids?: string[];
            label_ids?: number[];
            deadline?: string;
            planned_start_date?: string;
        } = {
            name: input.name
        };

        if (input.description !== undefined) {
            body.description = input.description;
        }
        if (input.milestone_id !== undefined) {
            body.milestone_id = input.milestone_id;
        }
        if (input.group_id !== undefined) {
            body.group_id = input.group_id;
        }
        if (input.owner_ids !== undefined) {
            body.owner_ids = input.owner_ids;
        }
        if (input.label_ids !== undefined) {
            body.label_ids = input.label_ids;
        }
        if (input.deadline !== undefined) {
            body.deadline = input.deadline;
        }
        if (input.planned_start_date !== undefined) {
            body.planned_start_date = input.planned_start_date;
        }

        const response = await nango.post({
            // https://developer.shortcut.com/api/rest/v3#Create-Epic
            endpoint: '/api/v3/epics',
            data: body,
            retries: 10
        });

        const providerEpic = ProviderEpicSchema.parse(response.data);

        return {
            id: providerEpic.id,
            name: providerEpic.name,
            ...(providerEpic.description != null && { description: providerEpic.description }),
            ...(providerEpic.milestone_id != null && { milestone_id: providerEpic.milestone_id }),
            ...(providerEpic.group_id != null && { group_id: providerEpic.group_id }),
            ...(providerEpic.owner_ids !== undefined && { owner_ids: providerEpic.owner_ids }),
            ...(providerEpic.label_ids !== undefined && { label_ids: providerEpic.label_ids }),
            ...(providerEpic.deadline != null && { deadline: providerEpic.deadline }),
            ...(providerEpic.planned_start_date != null && { planned_start_date: providerEpic.planned_start_date }),
            ...(providerEpic.epic_state_id !== undefined && { epic_state_id: providerEpic.epic_state_id }),
            ...(providerEpic.position !== undefined && { position: providerEpic.position }),
            ...(providerEpic.created_at !== undefined && { created_at: providerEpic.created_at }),
            ...(providerEpic.updated_at !== undefined && { updated_at: providerEpic.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
