import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().describe('Lead ID. Example: "lead_mELh8FRqV6vRWJ5bgGdx7GpifIkEnoQFHg0hsxmQI1z"'),
    note: z.string().describe('Plain text note content.'),
    contact_id: z.string().optional().describe('Contact ID. Example: "cont_WkCG7ujzTYPCoOTUcao7tRUj9TMChmWgeNXimiJT9eJ"'),
    activity_at: z.string().optional().describe('ISO timestamp. Defaults to now.')
});

const ProviderNoteActivitySchema = z.object({
    id: z.string(),
    _type: z.string(),
    note: z.string().nullable().optional(),
    note_html: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    activity_at: z.string().nullable().optional(),
    date_created: z.string(),
    date_updated: z.string(),
    user_id: z.string().nullable().optional(),
    organization_id: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    created_by_name: z.string().nullable().optional(),
    updated_by_name: z.string().nullable().optional(),
    user_name: z.string().nullable().optional(),
    users: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    _type: z.string(),
    note: z.string().optional(),
    note_html: z.string().optional(),
    lead_id: z.string().optional(),
    contact_id: z.string().optional(),
    activity_at: z.string().optional(),
    date_created: z.string(),
    date_updated: z.string(),
    user_id: z.string().optional(),
    organization_id: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    created_by_name: z.string().optional(),
    updated_by_name: z.string().optional(),
    user_name: z.string().optional(),
    users: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a note activity on a lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.close.com/api/resources/activities/notes/create
            endpoint: '/v1/activity/note/',
            data: {
                lead_id: input.lead_id,
                note: input.note,
                ...(input.contact_id !== undefined && { contact_id: input.contact_id }),
                ...(input.activity_at !== undefined && { activity_at: input.activity_at })
            },
            retries: 3
        });

        const providerNote = ProviderNoteActivitySchema.parse(response.data);

        return {
            id: providerNote.id,
            _type: providerNote._type,
            date_created: providerNote.date_created,
            date_updated: providerNote.date_updated,
            ...(providerNote.note != null && { note: providerNote.note }),
            ...(providerNote.note_html != null && { note_html: providerNote.note_html }),
            ...(providerNote.lead_id != null && { lead_id: providerNote.lead_id }),
            ...(providerNote.contact_id != null && { contact_id: providerNote.contact_id }),
            ...(providerNote.activity_at != null && { activity_at: providerNote.activity_at }),
            ...(providerNote.user_id != null && { user_id: providerNote.user_id }),
            ...(providerNote.organization_id != null && { organization_id: providerNote.organization_id }),
            ...(providerNote.created_by != null && { created_by: providerNote.created_by }),
            ...(providerNote.updated_by != null && { updated_by: providerNote.updated_by }),
            ...(providerNote.created_by_name != null && { created_by_name: providerNote.created_by_name }),
            ...(providerNote.updated_by_name != null && { updated_by_name: providerNote.updated_by_name }),
            ...(providerNote.user_name != null && { user_name: providerNote.user_name }),
            ...(providerNote.users !== undefined && { users: providerNote.users })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
