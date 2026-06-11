import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    callSid: z.string().describe('The unique SID of the Call to delete. Example: "CA6b10957e2080e766c84e850b56e404f3"')
});

const ProviderResponseSchema = z
    .object({
        sid: z.string(),
        status: z.string().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        account_sid: z.string().optional(),
        to: z.string().optional(),
        from: z.string().optional(),
        price: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    sid: z.string(),
    status: z.string().optional(),
    deleted: z.boolean()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const CredentialsSchema = z
    .object({
        username: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Delete a call record in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-call',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        let accountSid: string | undefined;
        const credentialsResult = CredentialsSchema.safeParse(connection.credentials);
        if (credentialsResult.success) {
            accountSid = credentialsResult.data.username;
        } else if (metadata.account_sid) {
            accountSid = metadata.account_sid;
        }

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'AccountSid not found in connection credentials or metadata.'
            });
        }

        const response = await nango.delete({
            // https://www.twilio.com/docs/voice/api/call-resource#delete-a-call-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Calls/${encodeURIComponent(input.callSid)}.json`,
            retries: 3
        });

        if (!response.data) {
            return {
                sid: input.callSid,
                deleted: true
            };
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            sid: providerResponse.sid,
            ...(providerResponse.status != null && { status: providerResponse.status }),
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
