import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the activity to update. Example: 8'),
    subject: z.string().optional().describe('The subject of the activity'),
    type: z.string().optional().describe('The type of the activity'),
    owner_id: z.number().optional().describe('The ID of the user who owns the activity'),
    deal_id: z.number().optional().describe('The ID of the deal linked to the activity'),
    lead_id: z.string().optional().describe('The ID of the lead linked to the activity'),
    person_id: z.number().optional().describe('The ID of the person linked to the activity'),
    org_id: z.number().optional().describe('The ID of the organization linked to the activity'),
    project_id: z.number().optional().describe('The ID of the project linked to the activity'),
    due_date: z.string().optional().describe('The due date of the activity'),
    due_time: z.string().optional().describe('The due time of the activity'),
    duration: z.string().optional().describe('The duration of the activity'),
    busy: z.boolean().optional().describe('Whether the activity marks the assignee as busy or not in their calendar'),
    done: z.boolean().optional().describe('Whether the activity is marked as done or not'),
    public_description: z.string().optional().describe('The public description of the activity'),
    priority: z.number().optional().describe('The priority of the activity'),
    note: z.string().optional().describe('The note of the activity')
});

const ProviderActivitySchema = z.object({
    id: z.number(),
    subject: z.string().nullish(),
    type: z.string().nullish(),
    owner_id: z.number().nullish(),
    deal_id: z.number().nullish(),
    lead_id: z.string().nullish(),
    person_id: z.number().nullish(),
    org_id: z.number().nullish(),
    project_id: z.number().nullish(),
    due_date: z.string().nullish(),
    due_time: z.string().nullish(),
    duration: z.string().nullish(),
    busy: z.boolean().nullish(),
    done: z.boolean().nullish(),
    public_description: z.string().nullish(),
    priority: z.number().nullish(),
    note: z.string().nullish(),
    add_time: z.string().nullish(),
    update_time: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderActivitySchema
});

const OutputSchema = z.object({
    id: z.number(),
    subject: z.string().optional(),
    type: z.string().optional(),
    owner_id: z.number().optional(),
    deal_id: z.number().optional(),
    lead_id: z.string().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    project_id: z.number().optional(),
    due_date: z.string().optional(),
    due_time: z.string().optional(),
    duration: z.string().optional(),
    busy: z.boolean().optional(),
    done: z.boolean().optional(),
    public_description: z.string().optional(),
    priority: z.number().optional(),
    note: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const action = createAction({
    description: 'Update a activity in Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-activity',
        group: 'Activities'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.subject !== undefined) {
            updateData['subject'] = input.subject;
        }
        if (input.type !== undefined) {
            updateData['type'] = input.type;
        }
        if (input.owner_id !== undefined) {
            updateData['owner_id'] = input.owner_id;
        }
        if (input.deal_id !== undefined) {
            updateData['deal_id'] = input.deal_id;
        }
        if (input.lead_id !== undefined) {
            updateData['lead_id'] = input.lead_id;
        }
        if (input.person_id !== undefined) {
            updateData['person_id'] = input.person_id;
        }
        if (input.org_id !== undefined) {
            updateData['org_id'] = input.org_id;
        }
        if (input.project_id !== undefined) {
            updateData['project_id'] = input.project_id;
        }
        if (input.due_date !== undefined) {
            updateData['due_date'] = input.due_date;
        }
        if (input.due_time !== undefined) {
            updateData['due_time'] = input.due_time;
        }
        if (input.duration !== undefined) {
            updateData['duration'] = input.duration;
        }
        if (input.busy !== undefined) {
            updateData['busy'] = input.busy;
        }
        if (input.done !== undefined) {
            updateData['done'] = input.done;
        }
        if (input.public_description !== undefined) {
            updateData['public_description'] = input.public_description;
        }
        if (input.priority !== undefined) {
            updateData['priority'] = input.priority;
        }
        if (input.note !== undefined) {
            updateData['note'] = input.note;
        }

        // https://developers.pipedrive.com/docs/api/v1/Activities#updateActivity
        const response = await nango.put({
            endpoint: `/v1/activities/${input.id}`,
            data: updateData,
            retries: 3
        });

        if (!response.data || !response.data.success || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Activity not found or update failed',
                id: input.id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const activity = parsed.data;

        return {
            id: activity.id,
            ...(activity.subject != null && { subject: activity.subject }),
            ...(activity.type != null && { type: activity.type }),
            ...(activity.owner_id != null && { owner_id: activity.owner_id }),
            ...(activity.deal_id != null && { deal_id: activity.deal_id }),
            ...(activity.lead_id != null && { lead_id: activity.lead_id }),
            ...(activity.person_id != null && { person_id: activity.person_id }),
            ...(activity.org_id != null && { org_id: activity.org_id }),
            ...(activity.project_id != null && { project_id: activity.project_id }),
            ...(activity.due_date != null && { due_date: activity.due_date }),
            ...(activity.due_time != null && { due_time: activity.due_time }),
            ...(activity.duration != null && { duration: activity.duration }),
            ...(activity.busy != null && { busy: activity.busy }),
            ...(activity.done != null && { done: activity.done }),
            ...(activity.public_description != null && { public_description: activity.public_description }),
            ...(activity.priority != null && { priority: activity.priority }),
            ...(activity.note != null && { note: activity.note }),
            ...(activity.add_time != null && { add_time: activity.add_time }),
            ...(activity.update_time != null && { update_time: activity.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
