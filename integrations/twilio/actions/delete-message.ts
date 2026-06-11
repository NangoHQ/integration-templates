import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageSid: z.string().describe('The unique SID of the message to delete. Example: SM879b8d48ecdd19b5f63172ab88b03e45')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const action = createAction({
    description: 'Delete a message record in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountSid = metadata.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_sid is required in connection metadata.'
            });
        }

        // https://www.twilio.com/docs/sms/api/message-resource#delete-a-message-resource
        const response = await nango.delete({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(input.messageSid)}.json`,
            retries: 1
        });

        if (response.status === 204 || response.status === 200) {
            return { success: true };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: `Failed to delete message. Received status ${response.status}.`,
            status: response.status
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
