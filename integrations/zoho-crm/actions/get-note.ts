import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the note to retrieve. Example: "4150868000002748029"')
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string(),
    email: z.string().optional()
});

const ParentIdSchema = z.object({
    name: z.string().nullable().optional(),
    id: z.string()
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    Note_Title: z.string().nullable().optional(),
    Note_Content: z.string().nullable().optional(),
    Owner: OwnerSchema.optional(),
    Created_By: OwnerSchema.optional(),
    Modified_By: OwnerSchema.optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    Parent_Id: ParentIdSchema.nullable().optional(),
    $editable: z.boolean().optional(),
    $se_module: z.string().nullable().optional(),
    $is_shared_to_client: z.boolean().optional(),
    $voice_note: z.boolean().optional(),
    $size: z.any().nullable().optional(),
    $state: z.string().optional(),
    $attachments: z.any().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderNoteSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    note_title: z.string().optional(),
    note_content: z.string().optional(),
    owner: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    created_by: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    modified_by: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    parent_id: z
        .object({
            name: z.string().optional(),
            id: z.string()
        })
        .optional(),
    editable: z.boolean().optional(),
    se_module: z.string().optional(),
    is_shared_to_client: z.boolean().optional(),
    voice_note: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single note from Zoho CRM.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/notes-response.html
        const response = await nango.get({
            endpoint: `/crm/v2/Notes/${input.record_id}`,
            retries: 3
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                record_id: input.record_id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const note = parsed.data[0];

        if (!note) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                record_id: input.record_id
            });
        }

        return {
            id: note.id,
            ...(note.Note_Title != null && { note_title: note.Note_Title }),
            ...(note.Note_Content != null && { note_content: note.Note_Content }),
            ...(note.Owner && {
                owner: {
                    id: note.Owner.id,
                    ...(note.Owner.name && { name: note.Owner.name }),
                    ...(note.Owner.email && { email: note.Owner.email })
                }
            }),
            ...(note.Created_By && {
                created_by: {
                    id: note.Created_By.id,
                    ...(note.Created_By.name && { name: note.Created_By.name }),
                    ...(note.Created_By.email && { email: note.Created_By.email })
                }
            }),
            ...(note.Modified_By && {
                modified_by: {
                    id: note.Modified_By.id,
                    ...(note.Modified_By.name && { name: note.Modified_By.name }),
                    ...(note.Modified_By.email && { email: note.Modified_By.email })
                }
            }),
            ...(note.Created_Time && { created_time: note.Created_Time }),
            ...(note.Modified_Time && { modified_time: note.Modified_Time }),
            ...(note.Parent_Id && {
                parent_id: {
                    id: note.Parent_Id.id,
                    ...(note.Parent_Id.name && { name: note.Parent_Id.name })
                }
            }),
            ...(note.$editable !== undefined && { editable: note.$editable }),
            ...(note.$se_module != null && { se_module: note.$se_module }),
            ...(note.$is_shared_to_client !== undefined && { is_shared_to_client: note.$is_shared_to_client }),
            ...(note.$voice_note !== undefined && { voice_note: note.$voice_note })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
