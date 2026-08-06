import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountUuid: z.string().describe('The Dynatrace account UUID. Example: "9610a717-798c-423b-a80f-97cfebe72f89"'),
    tokenId: z.string().describe('The platform token ID. Example: "dt0s16.2ZNXNVFQ"'),
    status: z.enum(['ACTIVE', 'INACTIVE']).describe('The desired status of the platform token.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Activate or deactivate a platform token without deleting it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['platform-token:tokens:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/platform-tokens/update-platform-token-status
        await nango.put({
            endpoint: `iam/v1/accounts/${encodeURIComponent(input.accountUuid)}/platform-tokens/${encodeURIComponent(input.tokenId)}/status`,
            data: {
                status: input.status
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
