import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    content: z.string().describe('Note content. Example: "Follow-up call completed"'),
    deal_id: z.number().optional().describe('Deal ID to associate the note with. Example: 55383278'),
    person_id: z.number().optional().describe('Person ID to associate the note with. Example: 1309859835'),
    company_id: z.number().optional().describe('Company ID to associate the note with. Example: 138551860'),
    note_category_id: z.number().optional().describe('Optional note category ID. Example: 1')
});

const ProviderNoteSchema = z
    .object({
        id: z.number(),
        content: z.string().optional(),
        deal_id: z.number().nullable().optional(),
        person_id: z.number().nullable().optional(),
        company_id: z.number().nullable().optional(),
        note_category_id: z.number().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    company_id: z.number().optional(),
    note_category_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a new note (activity) associated with a deal, person, or company.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.deal_id === undefined && input.person_id === undefined && input.company_id === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of deal_id, person_id, or company_id must be provided.'
            });
        }

        const noteBody: Record<string, unknown> = {
            content: input.content
        };

        if (input.deal_id !== undefined) {
            noteBody['deal_id'] = input.deal_id;
        }
        if (input.person_id !== undefined) {
            noteBody['person_id'] = input.person_id;
        }
        if (input.company_id !== undefined) {
            noteBody['company_id'] = input.company_id;
        }
        if (input.note_category_id !== undefined) {
            noteBody['note_category_id'] = input.note_category_id;
        }

        const response = await nango.post({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/notes',
            data: {
                note: noteBody
            },
            retries: 3
        });

        const providerNote = ProviderNoteSchema.parse(response.data);

        return {
            id: providerNote.id,
            ...(providerNote.content != null && { content: providerNote.content }),
            ...(providerNote.deal_id != null && { deal_id: providerNote.deal_id }),
            ...(providerNote.person_id != null && { person_id: providerNote.person_id }),
            ...(providerNote.company_id != null && { company_id: providerNote.company_id }),
            ...(providerNote.note_category_id != null && { note_category_id: providerNote.note_category_id }),
            ...(providerNote.created_at != null && { created_at: providerNote.created_at }),
            ...(providerNote.updated_at != null && { updated_at: providerNote.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
