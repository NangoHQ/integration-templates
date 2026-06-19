import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note_title: z.string().optional().describe('Title of the note. Example: "Follow-up call"'),
    note_content: z.string().describe('Content of the note. Example: "Discussed pricing options with the client"'),
    parent_id: z.string().describe('ID of the record to associate the note with. Example: "123456789"'),
    se_module: z.string().describe('Module API name of the parent record. Example: "Leads", "Contacts", "Deals", "Accounts"')
});

const ProviderNoteSchema = z.object({
    code: z.string(),
    details: z.record(z.string(), z.unknown()),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderNoteSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    status: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Create a note in Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.notes.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/notes.html
        const response = await nango.post({
            endpoint: '/crm/v2/Notes',
            data: {
                data: [
                    {
                        ...(input.note_title !== undefined && { Note_Title: input.note_title }),
                        Note_Content: input.note_content,
                        Parent_Id: input.parent_id,
                        se_module: input.se_module
                    }
                ]
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const result = providerResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'API returned empty data array'
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: result.message,
                code: result.code
            });
        }

        const noteId = result.details['id'];
        if (typeof noteId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'API returned success but missing note ID',
                details: result.details
            });
        }

        const createdTime = result.details['Created_Time'];
        const modifiedTime = result.details['Modified_Time'];

        return {
            id: noteId,
            ...(typeof createdTime === 'string' && { created_time: createdTime }),
            ...(typeof modifiedTime === 'string' && { modified_time: modifiedTime }),
            status: result.status,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
