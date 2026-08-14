import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tokenId: z.string().describe('Platform token ID. Example: "dt0s16.XXXXXXXX"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'Revoke/delete a platform token.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['platform-token:tokens:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Metadata validation failed: accountUuid is required.'
            });
        }

        const accountUuid = metadataResult.data.accountUuid;

        await nango.delete({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/platform-tokens/delete-platform-token
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/platform-tokens/${encodeURIComponent(input.tokenId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
