import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4e5"'),
    subscriber_hash: z
        .string()
        .describe('The MD5 hash of the lowercase version of the list member\'s email address. Example: "f52b1fb13b40f6b01297aa7e5c1d8e5c"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string().optional().describe('The MD5 hash of the lowercase email address for the deleted member.'),
    status: z.string().optional().describe('The subscription status of the deleted member.')
});

const ProviderMemberSchema = z
    .object({
        id: z.string().optional(),
        status: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Delete or archive a member in Mailchimp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://mailchimp.com/developer/marketing/api/list-members/delete-list-member/
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/members/${encodeURIComponent(input.subscriber_hash)}`,
            retries: 3
        });

        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            const member = ProviderMemberSchema.parse(response.data);

            return {
                success: true,
                ...(member.id != null && { id: member.id }),
                ...(member.status != null && { status: member.status })
            };
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
