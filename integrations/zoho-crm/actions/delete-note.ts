import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note_id: z.string().describe('The unique ID of the note to delete. Example: "518200000004111"')
});

const ProviderDeleteResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z.record(z.string(), z.unknown()).optional(),
            message: z.string(),
            status: z.string()
        })
    )
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    note_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a note in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.notes.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/notes/delete-notes.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Notes/${input.note_id}`,
            retries: 3
        });

        const parsedResponse = ProviderDeleteResponseSchema.parse(response.data);

        if (!parsedResponse.data || parsedResponse.data.length === 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete note',
                note_id: input.note_id
            });
        }

        const result = parsedResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete note - no result returned',
                note_id: input.note_id
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result.message || 'Failed to delete note',
                note_id: input.note_id,
                code: result.code
            });
        }

        return {
            success: true,
            message: result.message || 'Note deleted successfully',
            note_id: input.note_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
