import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    content: z.string().describe('The content of the note in HTML format. Subject to sanitization on the back-end.'),
    deal_id: z.number().optional().describe('The ID of the deal the note will be attached to.'),
    person_id: z.number().optional().describe('The ID of the person the note will be attached to.'),
    org_id: z.number().optional().describe('The ID of the organization the note will be attached to.'),
    lead_id: z.number().optional().describe('The ID of the lead the note will be attached to.'),
    project_id: z.number().optional().describe('The ID of the project the note will be attached to.'),
    task_id: z.number().optional().describe('The ID of the task the note will be attached to.'),
    user_id: z.number().optional().describe('The ID of the user who will be marked as the author of the note. Only an admin can change the author.'),
    add_time: z
        .string()
        .optional()
        .describe('The optional creation date & time of the note in UTC. Can be set in the past or in the future. Format: YYYY-MM-DD HH:MM:SS'),
    pinned_to_lead_flag: z.number().optional().describe('If set to 1, the note will be pinned to the lead.'),
    pinned_to_project_flag: z.number().optional().describe('If set to 1, the note will be pinned to the project.')
});

const ProviderNoteSchema = z.object({
    id: z.number(),
    active_flag: z.boolean(),
    add_time: z.string(),
    content: z.string(),
    deal_id: z.number().nullish(),
    person_id: z.number().nullish(),
    org_id: z.number().nullish(),
    lead_id: z.number().nullish(),
    project_id: z.number().nullish(),
    task_id: z.number().nullish(),
    user_id: z.number(),
    update_time: z.string().nullish(),
    pinned_to_lead_flag: z.union([z.number(), z.boolean()]).optional(),
    pinned_to_project_flag: z.union([z.number(), z.boolean()]).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    lead_id: z.number().optional(),
    project_id: z.number().optional(),
    task_id: z.number().optional(),
    user_id: z.number(),
    add_time: z.string(),
    update_time: z.string().optional(),
    active_flag: z.boolean(),
    pinned_to_lead_flag: z.number().optional(),
    pinned_to_project_flag: z.number().optional()
});

const action = createAction({
    description: 'Create a note in Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:read', 'deals:write', 'activities:read', 'activities:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasEntityId = input.deal_id || input.person_id || input.org_id || input.lead_id || input.project_id || input.task_id;

        if (!hasEntityId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of deal_id, person_id, org_id, lead_id, project_id, or task_id is required.'
            });
        }

        // https://developers.pipedrive.com/docs/api/v1/Notes#addNote
        const response = await nango.post({
            endpoint: '/v1/notes',
            data: {
                content: input.content,
                ...(input.deal_id !== undefined && { deal_id: input.deal_id }),
                ...(input.person_id !== undefined && { person_id: input.person_id }),
                ...(input.org_id !== undefined && { org_id: input.org_id }),
                ...(input.lead_id !== undefined && { lead_id: input.lead_id }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.task_id !== undefined && { task_id: input.task_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.add_time !== undefined && { add_time: input.add_time }),
                ...(input.pinned_to_lead_flag !== undefined && {
                    pinned_to_lead_flag: input.pinned_to_lead_flag
                }),
                ...(input.pinned_to_project_flag !== undefined && {
                    pinned_to_project_flag: input.pinned_to_project_flag
                })
            },
            retries: 10
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Pipedrive API'
            });
        }

        const providerNote = ProviderNoteSchema.parse(response.data.data);

        return {
            id: providerNote.id,
            content: providerNote.content,
            ...(providerNote.deal_id != null && { deal_id: providerNote.deal_id }),
            ...(providerNote.person_id != null && { person_id: providerNote.person_id }),
            ...(providerNote.org_id != null && { org_id: providerNote.org_id }),
            ...(providerNote.lead_id != null && { lead_id: providerNote.lead_id }),
            ...(providerNote.project_id != null && { project_id: providerNote.project_id }),
            ...(providerNote.task_id != null && { task_id: providerNote.task_id }),
            user_id: providerNote.user_id,
            add_time: providerNote.add_time,
            ...(providerNote.update_time != null && { update_time: providerNote.update_time }),
            active_flag: providerNote.active_flag,
            ...(providerNote.pinned_to_lead_flag !== undefined && {
                pinned_to_lead_flag:
                    typeof providerNote.pinned_to_lead_flag === 'boolean' ? (providerNote.pinned_to_lead_flag ? 1 : 0) : providerNote.pinned_to_lead_flag
            }),
            ...(providerNote.pinned_to_project_flag !== undefined && {
                pinned_to_project_flag:
                    typeof providerNote.pinned_to_project_flag === 'boolean'
                        ? providerNote.pinned_to_project_flag
                            ? 1
                            : 0
                        : providerNote.pinned_to_project_flag
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
