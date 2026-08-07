import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyUuid: z.string().describe('The UUID of the account-level policy to delete. Example: "d0759a08-face-4a88-a520-13e892becccf"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    policyUuid: z.string()
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'Delete a custom account-level policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam-policies-management'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.parse(metadata);

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policy-management-api/policies/delete-policy
        await nango.delete({
            endpoint: `iam/v1/repo/account/${encodeURIComponent(parsedMetadata.accountUuid)}/policies/${encodeURIComponent(input.policyUuid)}`,
            retries: 3
        });

        return {
            success: true,
            policyUuid: input.policyUuid
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
