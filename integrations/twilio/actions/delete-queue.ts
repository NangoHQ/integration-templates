import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    queueSid: z.string().describe('The SID of the queue to delete. Example: "QU710d79ddc79e88ff10573c8b8bdd357e"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    queueSid: z.string().optional()
});

const CredentialsSchema = z.object({
    username: z.string().optional()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const action = createAction({
    description: 'Delete a call queue in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-queue',
        group: 'Queues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = CredentialsSchema.parse(connection.credentials || {});
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.parse(metadataRaw || {});
        const accountSid = credentials.username || metadata.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'missing_account_sid',
                message: 'Could not determine AccountSid from connection credentials or metadata.'
            });
        }

        // https://www.twilio.com/docs/voice/api/queue-resource#delete-a-queue-resource
        const response = await nango.delete({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Queues/${encodeURIComponent(input.queueSid)}.json`,
            retries: 1
        });

        if (response.status === 204) {
            return {
                success: true,
                queueSid: input.queueSid
            };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: `Failed to delete queue. Received status ${response.status}.`,
            queueSid: input.queueSid
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
