import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    application_sid: z.string().describe('The SID of the TwiML application to delete. Example: "AP6b52759af1ef554ebaba08debc6c99f4"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    application_sid: z.string()
});

const MetadataSchema = z.object({
    account_sid: z.string().describe('Twilio Account SID. Example: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')
});

const action = createAction({
    description: 'Delete a TwiML application in Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_sid is required in metadata.'
            });
        }

        const accountSid = metadataResult.data.account_sid;

        // https://www.twilio.com/docs/usage/api/applications
        await nango.delete({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Applications/${encodeURIComponent(input.application_sid)}.json`,
            retries: 1
        });

        return {
            success: true,
            application_sid: input.application_sid
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
