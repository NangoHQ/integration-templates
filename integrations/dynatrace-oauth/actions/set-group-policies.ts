import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupUuid: z.string().describe('The UUID of the user group. Example: "541802b0-623c-4193-8728-036ed01d4eb4"'),
    policyUuids: z.array(z.string()).describe('List of policy UUIDs to bind to the group. Replaces any existing bindings.')
});

const OutputSchema = z.object({
    groupUuid: z.string(),
    policyUuids: z.array(z.string())
});

const MetadataSchema = z.object({
    accountUuid: z.string().describe('The Dynatrace account UUID. Example: "9610a717-798c-423b-a80f-97cfebe72f89"')
});

const action = createAction({
    description: "Replace a group's entire set of bound policies in one call.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['iam-policies-management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metaParse = MetadataSchema.safeParse(metadata);
        if (!metaParse.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountUuid is required in metadata.'
            });
        }

        const accountUuid = metaParse.data.accountUuid;

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policy-management-api/bindings/put-group-bindings
        await nango.put({
            endpoint: `/iam/v1/repo/account/${encodeURIComponent(accountUuid)}/bindings/groups/${encodeURIComponent(input.groupUuid)}`,
            data: {
                policyUuids: input.policyUuids
            },
            retries: 3
        });

        return {
            groupUuid: input.groupUuid,
            policyUuids: input.policyUuids
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
