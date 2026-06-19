import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the note to update. Example: 123'),
    content: z.string().optional().describe('The content of the note in HTML format. Subject to sanitization on the back-end.'),
    lead_id: z.string().uuid().optional().describe('The ID of the lead the note will be attached to.'),
    deal_id: z.number().optional().describe('The ID of the deal the note will be attached to.'),
    person_id: z.number().optional().describe('The ID of the person the note will be attached to.'),
    org_id: z.number().optional().describe('The ID of the organization the note will be attached to.'),
    project_id: z.number().optional().describe('The ID of the project the note will be attached to.'),
    task_id: z.number().optional().describe('The ID of the task the note will be attached to.'),
    user_id: z.number().optional().describe('The ID of the user who will be marked as the author of the note. Only an admin can change the author.'),
    pinned_to_lead_flag: z.number().optional().describe('Whether the note is pinned to the lead. Values: 0 or 1.'),
    pinned_to_deal_flag: z.number().optional().describe('Whether the note is pinned to the deal. Values: 0 or 1.'),
    pinned_to_organization_flag: z.number().optional().describe('Whether the note is pinned to the organization. Values: 0 or 1.'),
    pinned_to_person_flag: z.number().optional().describe('Whether the note is pinned to the person. Values: 0 or 1.'),
    pinned_to_project_flag: z.number().optional().describe('Whether the note is pinned to the project. Values: 0 or 1.'),
    pinned_to_task_flag: z.number().optional().describe('Whether the note is pinned to the task. Values: 0 or 1.')
});

const ProviderSuccessResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        id: z.number(),
        content: z.string().nullable().optional(),
        lead_id: z.string().uuid().nullable().optional(),
        deal_id: z.number().nullable().optional(),
        person_id: z.number().nullable().optional(),
        org_id: z.number().nullable().optional(),
        project_id: z.number().nullable().optional(),
        task_id: z.number().nullable().optional(),
        user_id: z.number().nullable().optional(),
        add_time: z.string().nullable().optional(),
        update_time: z.string().nullable().optional(),
        pinned_to_lead_flag: z.union([z.number(), z.boolean()]).nullable().optional(),
        pinned_to_deal_flag: z.union([z.number(), z.boolean()]).nullable().optional(),
        pinned_to_organization_flag: z.union([z.number(), z.boolean()]).nullable().optional(),
        pinned_to_person_flag: z.union([z.number(), z.boolean()]).nullable().optional(),
        pinned_to_project_flag: z.union([z.number(), z.boolean()]).nullable().optional(),
        pinned_to_task_flag: z.union([z.number(), z.boolean()]).nullable().optional()
    })
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    lead_id: z.string().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    project_id: z.number().optional(),
    task_id: z.number().optional(),
    user_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    pinned_to_lead_flag: z.number().optional(),
    pinned_to_deal_flag: z.number().optional(),
    pinned_to_organization_flag: z.number().optional(),
    pinned_to_person_flag: z.number().optional(),
    pinned_to_project_flag: z.number().optional(),
    pinned_to_task_flag: z.number().optional()
});

const action = createAction({
    description: 'Update a note in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Notes#updateNote
        const response = await nango.put({
            endpoint: `/v1/notes/${input.id}`,
            data: {
                ...(input.content !== undefined && { content: input.content }),
                ...(input.lead_id !== undefined && { lead_id: input.lead_id }),
                ...(input.deal_id !== undefined && { deal_id: input.deal_id }),
                ...(input.person_id !== undefined && { person_id: input.person_id }),
                ...(input.org_id !== undefined && { org_id: input.org_id }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.task_id !== undefined && { task_id: input.task_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.pinned_to_lead_flag !== undefined && { pinned_to_lead_flag: input.pinned_to_lead_flag }),
                ...(input.pinned_to_deal_flag !== undefined && { pinned_to_deal_flag: input.pinned_to_deal_flag }),
                ...(input.pinned_to_organization_flag !== undefined && { pinned_to_organization_flag: input.pinned_to_organization_flag }),
                ...(input.pinned_to_person_flag !== undefined && { pinned_to_person_flag: input.pinned_to_person_flag }),
                ...(input.pinned_to_project_flag !== undefined && { pinned_to_project_flag: input.pinned_to_project_flag }),
                ...(input.pinned_to_task_flag !== undefined && { pinned_to_task_flag: input.pinned_to_task_flag })
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                id: input.id
            });
        }

        const providerResponse = ProviderSuccessResponseSchema.parse(response.data);
        const providerNote = providerResponse.data;

        // Helper to convert boolean to number (0 or 1) for pinned flags
        const toNumber = (val: boolean | number | null | undefined): number | undefined => {
            if (val === null || val === undefined) return undefined;
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
        };

        return {
            id: providerNote.id,
            ...(providerNote.content != null && { content: providerNote.content }),
            ...(providerNote.lead_id != null && { lead_id: providerNote.lead_id }),
            ...(providerNote.deal_id != null && { deal_id: providerNote.deal_id }),
            ...(providerNote.person_id != null && { person_id: providerNote.person_id }),
            ...(providerNote.org_id != null && { org_id: providerNote.org_id }),
            ...(providerNote.project_id != null && { project_id: providerNote.project_id }),
            ...(providerNote.task_id != null && { task_id: providerNote.task_id }),
            ...(providerNote.user_id != null && { user_id: providerNote.user_id }),
            ...(providerNote.add_time != null && { add_time: providerNote.add_time }),
            ...(providerNote.update_time != null && { update_time: providerNote.update_time }),
            ...(providerNote.pinned_to_lead_flag !== undefined && { pinned_to_lead_flag: toNumber(providerNote.pinned_to_lead_flag) }),
            ...(providerNote.pinned_to_deal_flag !== undefined && { pinned_to_deal_flag: toNumber(providerNote.pinned_to_deal_flag) }),
            ...(providerNote.pinned_to_organization_flag !== undefined && { pinned_to_organization_flag: toNumber(providerNote.pinned_to_organization_flag) }),
            ...(providerNote.pinned_to_person_flag !== undefined && { pinned_to_person_flag: toNumber(providerNote.pinned_to_person_flag) }),
            ...(providerNote.pinned_to_project_flag !== undefined && { pinned_to_project_flag: toNumber(providerNote.pinned_to_project_flag) }),
            ...(providerNote.pinned_to_task_flag !== undefined && { pinned_to_task_flag: toNumber(providerNote.pinned_to_task_flag) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
