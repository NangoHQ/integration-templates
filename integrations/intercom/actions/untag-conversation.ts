import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_id: z.string().describe('The ID of the conversation to untag. Example: "123"'),
    tag_id: z.string().describe('The ID of the tag to remove. Example: "456"'),
    admin_id: z.string().describe('The ID of the admin performing the untag operation. Example: "789"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the tag was successfully removed')
});

const action = createAction({
    description: 'Remove a tag from a conversation',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Tags
        await nango.delete({
            endpoint: `/conversations/${encodeURIComponent(input.conversation_id)}/tags/${encodeURIComponent(input.tag_id)}`,
            data: {
                admin_id: input.admin_id
            },
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
