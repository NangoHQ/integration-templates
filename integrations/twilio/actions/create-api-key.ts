import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    friendlyName: z.string().optional().describe('A descriptive name for the API key. Example: "My App Key"')
});

const ProviderKeySchema = z.object({
    sid: z.string(),
    secret: z.string(),
    friendly_name: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    secret: z.string(),
    friendlyName: z.string().optional()
});

const action = createAction({
    description: 'Create an API key in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-api-key',
        group: 'API Keys'
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
                type: 'missing_account_sid',
                message: 'account_sid is required in metadata.'
            });
        }

        const accountSid = metadataResult.data.account_sid;

        const response = await nango.post({
            // https://www.twilio.com/docs/usage/api/keys
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Keys.json`,
            data: {
                ...(input.friendlyName !== undefined && { FriendlyName: input.friendlyName })
            },
            retries: 3
        });

        const providerKey = ProviderKeySchema.parse(response.data);

        return {
            sid: providerKey.sid,
            secret: providerKey.secret,
            ...(providerKey.friendly_name != null && { friendlyName: providerKey.friendly_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
