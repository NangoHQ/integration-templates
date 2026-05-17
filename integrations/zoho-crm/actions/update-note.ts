import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the note to update. Example: "4150868000002975099"'),
    noteTitle: z.string().optional().describe('The updated title of the note. Example: "Contacted"'),
    noteContent: z.string().optional().describe('The updated content of the note. Example: "Tracking done. Happy with the customer"')
});

const ProviderResponseItemSchema = z.object({
    code: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResponseItemSchema)
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the updated note'),
    status: z.string().describe('The status of the update operation. Example: "success"'),
    message: z.string().describe('A message describing the result. Example: "record updated"'),
    modifiedTime: z.string().optional().describe('The timestamp when the note was last modified'),
    createdTime: z.string().optional().describe('The timestamp when the note was created')
});

const action = createAction({
    description: 'Update a note in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.notes.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.noteTitle !== undefined) {
            updateData['Note_Title'] = input.noteTitle;
        }

        if (input.noteContent !== undefined) {
            updateData['Note_Content'] = input.noteContent;
        }

        // https://www.zoho.com/crm/developer/docs/api/v8/update-notes.html
        const response = await nango.put({
            endpoint: `/crm/v2/Notes/${input.id}`,
            data: {
                data: [updateData]
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Empty response from Zoho CRM'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.data || providerResponse.data.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho CRM: no data returned'
            });
        }

        const result = providerResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho CRM: result is undefined'
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: result.message,
                code: result.code,
                details: result.details
            });
        }

        const details = result.details || {};
        const resultId = typeof details['id'] === 'string' ? details['id'] : typeof details['Id'] === 'string' ? details['Id'] : input.id;
        const modifiedTime = typeof details['Modified_Time'] === 'string' ? details['Modified_Time'] : undefined;
        const createdTime = typeof details['Created_Time'] === 'string' ? details['Created_Time'] : undefined;

        return {
            id: resultId,
            status: result.status,
            message: result.message,
            ...(modifiedTime && { modifiedTime }),
            ...(createdTime && { createdTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
