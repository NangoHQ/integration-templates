import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Note activity ID. Example: "acti_kwWA3rOfy4BnaZ8QQk3RIIAz51dU9ayiluy1s961Oiw"'),
    note: z.string().optional().describe('Plain text note content. Setting this overwrites note_html.'),
    note_html: z.string().optional().describe('HTML note content. Takes precedence over note if both are provided.'),
    contact_id: z.string().optional().describe('Contact ID to associate with the note. Example: "cont_WkCG7ujzTYPCoOTUcao7tRUj9TMChmWgeNXimiJT9eJ"'),
    activity_at: z.string().optional().describe('ISO 8601 timestamp for when the activity occurred. Example: "2026-06-19T12:00:00.000000+00:00"'),
    pinned: z.boolean().optional().describe('Whether the note is pinned.'),
    title: z.string().optional().describe('Note title.')
});

const ProviderResponseSchema = z.object({
    _type: z.string(),
    activity_at: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    created_by_name: z.string().nullable().optional(),
    date_created: z.string(),
    date_updated: z.string(),
    id: z.string(),
    lead_id: z.string().nullable().optional(),
    organization_id: z.string(),
    updated_by: z.string().nullable().optional(),
    updated_by_name: z.string().nullable().optional(),
    user_id: z.string().nullable().optional(),
    user_name: z.string().nullable().optional(),
    users: z.array(z.string()).optional(),
    note: z.string().optional(),
    note_html: z.string().optional(),
    pinned: z.boolean().optional(),
    pinned_at: z.string().nullable().optional(),
    title: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    _type: z.string(),
    activity_at: z.string().optional(),
    contact_id: z.string().optional(),
    created_by: z.string().optional(),
    created_by_name: z.string().optional(),
    date_created: z.string(),
    date_updated: z.string(),
    lead_id: z.string().optional(),
    organization_id: z.string(),
    updated_by: z.string().optional(),
    updated_by_name: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    users: z.array(z.string()).optional(),
    note: z.string().optional(),
    note_html: z.string().optional(),
    pinned: z.boolean().optional(),
    pinned_at: z.string().optional(),
    title: z.string().optional()
});

const action = createAction({
    description: 'Update an existing note activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.note !== undefined) {
            data['note'] = input.note;
        }
        if (input.note_html !== undefined) {
            data['note_html'] = input.note_html;
        }
        if (input.contact_id !== undefined) {
            data['contact_id'] = input.contact_id;
        }
        if (input.activity_at !== undefined) {
            data['activity_at'] = input.activity_at;
        }
        if (input.pinned !== undefined) {
            data['pinned'] = input.pinned;
        }
        if (input.title !== undefined) {
            data['title'] = input.title;
        }

        const response = await nango.put({
            // https://developer.close.com/api/resources/activities/notes/update
            endpoint: `/v1/activity/note/${encodeURIComponent(input.id)}/`,
            data: data,
            retries: 3
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Close API returned status ${response.status}`,
                status: response.status
            });
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Close API response',
                errors: providerResponse.error.issues
            });
        }

        const parsed = providerResponse.data;

        return {
            id: parsed.id,
            _type: parsed._type,
            date_created: parsed.date_created,
            date_updated: parsed.date_updated,
            organization_id: parsed.organization_id,
            ...(parsed.activity_at != null && { activity_at: parsed.activity_at }),
            ...(parsed.contact_id != null && { contact_id: parsed.contact_id }),
            ...(parsed.created_by != null && { created_by: parsed.created_by }),
            ...(parsed.created_by_name != null && { created_by_name: parsed.created_by_name }),
            ...(parsed.lead_id != null && { lead_id: parsed.lead_id }),
            ...(parsed.updated_by != null && { updated_by: parsed.updated_by }),
            ...(parsed.updated_by_name != null && { updated_by_name: parsed.updated_by_name }),
            ...(parsed.user_id != null && { user_id: parsed.user_id }),
            ...(parsed.user_name != null && { user_name: parsed.user_name }),
            ...(parsed.users !== undefined && { users: parsed.users }),
            ...(parsed.note !== undefined && { note: parsed.note }),
            ...(parsed.note_html !== undefined && { note_html: parsed.note_html }),
            ...(parsed.pinned !== undefined && { pinned: parsed.pinned }),
            ...(parsed.pinned_at != null && { pinned_at: parsed.pinned_at }),
            ...(parsed.title != null && { title: parsed.title })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
