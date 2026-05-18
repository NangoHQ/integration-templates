import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Default is 1.'),
    per_page: z.number().optional().describe('Number of records per page. Default is 200, maximum is 200.'),
    fields: z.string().optional().describe('Comma-separated list of field API names to retrieve. Example: "id,Note_Title,Note_Content,Created_Time"')
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    email: z.string().optional()
});

const ModuleSchema = z.object({
    api_name: z.string().optional(),
    id: z.string().optional()
});

const ParentIdSchema = z.object({
    module: ModuleSchema.optional(),
    name: z.string().optional(),
    id: z.string().optional()
});

const NoteSchema = z.object({
    id: z.string(),
    Note_Title: z.string().nullable().optional(),
    Note_Content: z.string().nullable().optional(),
    Owner: OwnerSchema.optional(),
    Created_Time: z.string().optional(),
    Created_By: OwnerSchema.optional(),
    Modified_Time: z.string().optional(),
    Modified_By: OwnerSchema.optional(),
    Parent_Id: ParentIdSchema.optional()
});

const InfoSchema = z.object({
    per_page: z.number().optional(),
    count: z.number().optional(),
    page: z.number().optional(),
    more_records: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(NoteSchema),
    info: InfoSchema.optional()
});

const OutputNoteSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
    owner_name: z.string().optional(),
    owner_id: z.string().optional(),
    owner_email: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    parent_module: z.string().optional(),
    parent_record_name: z.string().optional(),
    parent_record_id: z.string().optional()
});

const OutputSchema = z.object({
    notes: z.array(OutputNoteSchema),
    pagination: z.object({
        page: z.number(),
        per_page: z.number(),
        count: z.number(),
        has_more: z.boolean()
    })
});

const action = createAction({
    description: 'List notes from Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-notes',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.notes.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/notes.html
        const response = await nango.get({
            endpoint: '/crm/v2/Notes',
            params: params,
            retries: 3
        });

        if (response.status === 204) {
            return {
                notes: [],
                pagination: {
                    page: input.page || 1,
                    per_page: input.per_page || 200,
                    count: 0,
                    has_more: false
                }
            };
        }

        if (response.status === 403) {
            throw new nango.ActionError({
                type: 'permission_denied',
                message: 'Only admin users can fetch records from the Notes module.'
            });
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Empty response from Zoho CRM API'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Zoho CRM response',
                details: parsed.error.issues
            });
        }

        const providerData = parsed.data;
        const info = providerData.info || {};

        const notes = providerData.data.map((note) => ({
            id: note.id,
            ...(note.Note_Title != null && { title: note.Note_Title }),
            ...(note.Note_Content != null && { content: note.Note_Content }),
            ...(note.Owner?.name != null && { owner_name: note.Owner.name }),
            ...(note.Owner?.id != null && { owner_id: note.Owner.id }),
            ...(note.Owner?.email != null && { owner_email: note.Owner.email }),
            ...(note.Created_Time != null && { created_time: note.Created_Time }),
            ...(note.Modified_Time != null && { modified_time: note.Modified_Time }),
            ...(note.Parent_Id?.module?.api_name != null && { parent_module: note.Parent_Id.module.api_name }),
            ...(note.Parent_Id?.name != null && { parent_record_name: note.Parent_Id.name }),
            ...(note.Parent_Id?.id != null && { parent_record_id: note.Parent_Id.id })
        }));

        return {
            notes,
            pagination: {
                page: info.page || input.page || 1,
                per_page: info.per_page || input.per_page || 200,
                count: info.count || notes.length,
                has_more: info.more_records || false
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
