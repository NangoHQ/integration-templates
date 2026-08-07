import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyUuid: z.string().describe('The UUID of the policy to bind to groups. Example: "6e6edf99-3ef3-40f5-adc5-635401719672"'),
    groupUuids: z.array(z.string()).describe('Array of group UUIDs to bind the policy to. Example: ["0bb8915e-fe63-4e37-a1ba-102e7daa375a"]'),
    boundaries: z.array(z.string()).optional().describe('Optional array of boundary UUIDs for the binding.')
});

const OutputSchema = z.null();

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: "Grant a policy's access to one or more groups.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam-policies-management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const configResult = MetadataSchema.safeParse(metadata);
        if (!configResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing accountUuid in metadata.'
            });
        }
        const accountUuid = configResult.data.accountUuid;

        const body: { groups: string[]; boundaries?: string[] } = {
            groups: input.groupUuids
        };
        if (input.boundaries !== undefined) {
            body.boundaries = input.boundaries;
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policy-management-api/bindings/post-policy-binding
        await nango.post({
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/bindings/${encodeURIComponent(input.policyUuid)}`,
            data: body,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
