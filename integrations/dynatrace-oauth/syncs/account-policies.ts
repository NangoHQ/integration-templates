import { createSync } from 'nango';
import { z } from 'zod';

const RawPolicySchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    tags: z.array(z.string()),
    category: z.string()
});

const RawPoliciesResponseSchema = z.object({
    policies: z.array(RawPolicySchema)
});

const AccountPolicySchema = z.object({
    id: z.string(),
    uuid: z.string(),
    name: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    category: z.string()
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const sync = createSync({
    description: 'Sync custom access policies defined at this account level (excludes Dynatrace built-in/global policies).',
    version: '1.1.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        AccountPolicy: AccountPolicySchema
    },

    exec: async (nango) => {
        // No incremental filter documented; full refresh required.
        // Provider only exposes /iam/v1/repo/account/{accountUuid}/policies with no changed-since
        // filter, no deleted-record endpoint, and no resumable cursor or pagination.

        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error(`Missing or invalid accountUuid in metadata: ${parsedMetadata.error.message}`);
        }
        const accountUuid = parsedMetadata.data.accountUuid;

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policy-management/list-account-policies
        const response = await nango.get({
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/policies`,
            retries: 3
        });

        const parsedResponse = RawPoliciesResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse policies response: ${parsedResponse.error.message}`);
        }

        await nango.trackDeletesStart('AccountPolicy');

        const policies = parsedResponse.data.policies.map((policy) => {
            return {
                id: policy.uuid,
                uuid: policy.uuid,
                name: policy.name,
                ...(policy.description != null && { description: policy.description }),
                tags: policy.tags,
                category: policy.category
            };
        });

        if (policies.length > 0) {
            await nango.batchSave(policies, 'AccountPolicy');
        }

        await nango.trackDeletesEnd('AccountPolicy');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
