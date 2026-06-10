import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageSid: z.string().describe('The SID of the Message resource. Example: SMxxxxx'),
    mediaSid: z.string().describe('The SID of the media resource to delete. Example: MExxxxx')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const MetadataSchema = z.object({
    account_sid: z.string().describe('Twilio Account SID. Example: ACxxxxx')
});

const ErrorSchema = z.object({
    status: z.number().optional()
});

const action = createAction({
    description: 'Delete a media resource attached to a Twilio message.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-message-media',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const accountSid = metadata.account_sid;

        // https://www.twilio.com/docs/messaging/api/media-resource#delete-a-media-resource
        // @allowTryCatch: Twilio returns 404 when the media does not exist.
        // We treat this as success since the goal is idempotent deletion.
        try {
            await nango.delete({
                baseUrlOverride: 'https://api.twilio.com',
                endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(input.messageSid)}/Media/${encodeURIComponent(input.mediaSid)}.json`,
                retries: 3
            });
        } catch (error) {
            const parsed = ErrorSchema.safeParse(error);
            if (parsed.success && parsed.data.status === 404) {
                return { success: true };
            }
            throw error;
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
