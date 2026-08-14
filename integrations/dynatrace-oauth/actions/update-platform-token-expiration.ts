import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tokenId: z.string().describe('Platform token ID. Example: "dt0s16.JJEM45HZ"'),
    expirationDate: z.string().describe('New expiration date as an ISO-8601 timestamp string. Example: "2027-12-31T23:59:59Z"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: "Change a platform token's expiration date.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['platform-token:tokens:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataParse = ConnectionConfigSchema.safeParse(metadata);
        if (!metadataParse.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing accountUuid in metadata.'
            });
        }
        const { accountUuid } = metadataParse.data;

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/platform-tokens
        await nango.put({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/platform-tokens/${encodeURIComponent(input.tokenId)}/expiration-date`,
            data: {
                expirationDate: input.expirationDate
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
