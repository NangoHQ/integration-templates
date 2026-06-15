import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sid: z.string().describe('The SID of the API Key to update. Example: "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'),
    friendly_name: z.string().describe('The new friendly name for the API Key. Example: "Updated Key Name"')
});

const ProviderApiKeySchema = z
    .object({
        sid: z.string(),
        friendly_name: z.string().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        account_sid: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    sid: z.string(),
    friendly_name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    account_sid: z.string().optional()
});

const MetadataSchema = z.object({
    account_sid: z.string().describe('Twilio Account SID. Example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"')
});

const action = createAction({
    description: 'Update an API key in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-api-key',
        group: 'Keys'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [''],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);
        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing account_sid in metadata.'
            });
        }
        const accountSid = metadataResult.data.account_sid;

        // https://www.twilio.com/docs/usage/api/keys
        const response = await nango.post({
            baseUrlOverride: 'https://api.twilio.com',
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Keys/${encodeURIComponent(input.sid)}.json`,
            data: `FriendlyName=${encodeURIComponent(input.friendly_name)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'API Key not found or update failed.',
                sid: input.sid
            });
        }

        const providerKey = ProviderApiKeySchema.parse(response.data);

        return {
            sid: providerKey.sid,
            ...(providerKey.friendly_name !== undefined && { friendly_name: providerKey.friendly_name }),
            ...(providerKey.date_created !== undefined && { date_created: providerKey.date_created }),
            ...(providerKey.date_updated !== undefined && { date_updated: providerKey.date_updated }),
            ...(providerKey.account_sid !== undefined && { account_sid: providerKey.account_sid })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
