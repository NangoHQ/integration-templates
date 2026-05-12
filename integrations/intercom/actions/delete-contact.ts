import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier for the contact to delete. Example: "5f3c8b3e8f0e3c0001a2b3c4"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    deleted_id: z.string().optional()
});

const action = createAction({
    description: 'Delete a contact by ID',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts
        await nango.delete({
            endpoint: `/contacts/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            success: true,
            deleted_id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
