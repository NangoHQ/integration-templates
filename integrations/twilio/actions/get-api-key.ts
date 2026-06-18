import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sid: z.string().describe('The SID of the API Key to retrieve. Example: "SKaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')
});

const ProviderResponseSchema = z.object({
    sid: z.string(),
    friendly_name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    friendly_name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const TwilioCredentialsSchema = z.union([
    z.object({
        type: z.literal('BASIC'),
        username: z.string()
    }),
    z.object({
        type: z.literal('API_KEY'),
        apiKey: z.string()
    })
]);

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single API key from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();
        let accountSid: string | undefined;

        if (connection.credentials && typeof connection.credentials === 'object') {
            const parsedCredentials = TwilioCredentialsSchema.safeParse(connection.credentials);
            if (parsedCredentials.success) {
                // For API_KEY credentials, the apiKey field is the key SID (SK…), not the Account SID.
                // Fall through to metadata for account_sid resolution.
                accountSid = parsedCredentials.data.type === 'BASIC' ? parsedCredentials.data.username : undefined;
            }
        }

        if (!accountSid) {
            accountSid = metadata.account_sid;
        }

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'missing_account_sid',
                message: 'Could not determine AccountSid from connection credentials or metadata.'
            });
        }

        // https://www.twilio.com/docs/usage/api/keys
        const response = await nango.get({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Keys/${encodeURIComponent(input.sid)}.json`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            sid: providerData.sid,
            ...(providerData.friendly_name !== undefined && { friendly_name: providerData.friendly_name }),
            ...(providerData.date_created !== undefined && { date_created: providerData.date_created }),
            ...(providerData.date_updated !== undefined && { date_updated: providerData.date_updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
