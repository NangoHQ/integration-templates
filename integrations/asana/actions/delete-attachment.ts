import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    attachment_gid: z.string().describe('Globally unique identifier for the attachment. Example: "1234567890"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an attachment by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['attachments:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.asana.com/reference/deleteattachment
            endpoint: `/api/1.0/attachments/${input.attachment_gid}`,
            retries: 1
        });

        return {
            success: response.status === 200 || response.status === 204
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
