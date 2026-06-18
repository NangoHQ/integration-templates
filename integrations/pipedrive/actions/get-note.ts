import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the note to retrieve. Example: 123')
});

const ProviderNoteSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    lead_id: z.string().nullable().optional(),
    project_id: z.number().optional(),
    task_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    active_flag: z.boolean().optional(),
    pinned_to_lead_flag: z.boolean().optional(),
    pinned_to_deal_flag: z.boolean().optional(),
    pinned_to_organization_flag: z.boolean().optional(),
    pinned_to_person_flag: z.boolean().optional(),
    pinned_to_project_flag: z.boolean().optional(),
    pinned_to_task_flag: z.boolean().optional(),
    last_update_user_id: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    lead_id: z.string().nullable().optional(),
    project_id: z.number().optional(),
    task_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    active_flag: z.boolean().optional(),
    pinned_to_lead_flag: z.boolean().optional(),
    pinned_to_deal_flag: z.boolean().optional(),
    pinned_to_organization_flag: z.boolean().optional(),
    pinned_to_person_flag: z.boolean().optional(),
    pinned_to_project_flag: z.boolean().optional(),
    pinned_to_task_flag: z.boolean().optional(),
    last_update_user_id: z.number().nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single note from Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:read', 'contacts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Notes#getNote
        const response = await nango.get({
            endpoint: `/v1/notes/${input.id}`,
            retries: 3
        });

        if (!response.data || !response.data.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                id: input.id
            });
        }

        const note = ProviderNoteSchema.parse(response.data.data);

        return {
            id: note.id,
            ...(note.content != null && { content: note.content }),
            ...(note.user_id != null && { user_id: note.user_id }),
            ...(note.deal_id != null && { deal_id: note.deal_id }),
            ...(note.person_id != null && { person_id: note.person_id }),
            ...(note.org_id != null && { org_id: note.org_id }),
            ...(note.lead_id != null && { lead_id: note.lead_id }),
            ...(note.project_id != null && { project_id: note.project_id }),
            ...(note.task_id != null && { task_id: note.task_id }),
            ...(note.add_time != null && { add_time: note.add_time }),
            ...(note.update_time != null && { update_time: note.update_time }),
            ...(note.active_flag != null && { active_flag: note.active_flag }),
            ...(note.pinned_to_lead_flag != null && { pinned_to_lead_flag: note.pinned_to_lead_flag }),
            ...(note.pinned_to_deal_flag != null && { pinned_to_deal_flag: note.pinned_to_deal_flag }),
            ...(note.pinned_to_organization_flag != null && { pinned_to_organization_flag: note.pinned_to_organization_flag }),
            ...(note.pinned_to_person_flag != null && { pinned_to_person_flag: note.pinned_to_person_flag }),
            ...(note.pinned_to_project_flag != null && { pinned_to_project_flag: note.pinned_to_project_flag }),
            ...(note.pinned_to_task_flag != null && { pinned_to_task_flag: note.pinned_to_task_flag }),
            ...(note.last_update_user_id != null && { last_update_user_id: note.last_update_user_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
