import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The ID of the contact list to delete. Example: "fa1dbbb4-10af-42d7-b07e-d1ab501a805b"'),
    delete_contacts: z.boolean().optional().describe('If true, also delete every contact on the list.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a contact list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/sendgrid/api-reference/contactdb-lists/delete-a-list
        await nango.delete({
            endpoint: `/v3/marketing/lists/${encodeURIComponent(input.list_id)}`,
            params: {
                ...(input.delete_contacts !== undefined && { delete_contacts: String(input.delete_contacts) })
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
