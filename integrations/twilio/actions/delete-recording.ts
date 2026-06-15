import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordingSid: z.string().describe('The unique SID of the recording to delete. Example: "RE1234567890abcdef1234567890abcdef"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a recording in Twilio',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-recording',
        group: 'Recordings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const MetadataSchema = z.object({
            account_sid: z.string()
        });

        const metadataResult = MetadataSchema.safeParse(metadata);
        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'account_sid is required in metadata.'
            });
        }

        const accountSid = metadataResult.data.account_sid;

        const response = await nango.delete({
            // https://www.twilio.com/docs/usage/api
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Recordings/${encodeURIComponent(input.recordingSid)}.json`,
            retries: 10
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content, but received ${response.status}`,
                recordingSid: input.recordingSid
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
