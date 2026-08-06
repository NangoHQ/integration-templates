import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderPolicySchema = z
    .object({
        uuid: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        tags: z.array(z.unknown()),
        category: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    policies: z.array(ProviderPolicySchema)
});

const action = createAction({
    description: 'List custom access policies defined directly at this account level (excludes Dynatrace built-in/global policies).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:policies:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let accountUuid = connection.connection_config?.['accountUuid'];

        if (!accountUuid || typeof accountUuid !== 'string') {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && 'accountUuid' in metadata) {
                const metaUuid = metadata['accountUuid'];
                if (typeof metaUuid === 'string') {
                    accountUuid = metaUuid;
                }
            }
        }

        if (!accountUuid || typeof accountUuid !== 'string') {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is missing from connection configuration and metadata.'
            });
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policies/list-account-policies
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/policies`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response body.'
            });
        }

        const rawData = response.data;
        const rawPolicies = 'policies' in rawData ? rawData.policies : undefined;

        if (!Array.isArray(rawPolicies)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected policies array in response.'
            });
        }

        const policies = rawPolicies.map((item: unknown) => {
            const parsed = ProviderPolicySchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a policy object from the provider response.',
                    detail: parsed.error.message
                });
            }
            return parsed.data;
        });

        return { policies };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
