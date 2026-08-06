import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note_id: z.number().describe('Note ID. Example: 889038936'),
    content: z.string().describe('Updated note content')
});

const ProviderNoteSchema = z.object({
    id: z.number(),
    content: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().nullable().optional(),
    company_id: z.number().nullable().optional(),
    person_id: z.number().nullable().optional(),
    note_category_id: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    title: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    company_id: z.number().optional(),
    person_id: z.number().optional(),
    note_category_id: z.number().optional()
});

const action = createAction({
    description: 'Update the content of an existing note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.put({
            endpoint: `api/v3/notes/${encodeURIComponent(String(input.note_id))}`,
            data: {
                note: {
                    content: input.content
                }
            },
            retries: 3
        });

        const providerNote = ProviderNoteSchema.parse(response.data);

        return {
            id: providerNote.id,
            ...(providerNote.content != null && { content: providerNote.content }),
            ...(providerNote.title != null && { title: providerNote.title }),
            ...(providerNote.created_at !== undefined && { created_at: providerNote.created_at }),
            ...(providerNote.updated_at !== undefined && { updated_at: providerNote.updated_at }),
            ...(providerNote.user_id !== undefined && { user_id: providerNote.user_id }),
            ...(providerNote.deal_id != null && { deal_id: providerNote.deal_id }),
            ...(providerNote.company_id != null && { company_id: providerNote.company_id }),
            ...(providerNote.person_id != null && { person_id: providerNote.person_id }),
            ...(providerNote.note_category_id != null && { note_category_id: providerNote.note_category_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
