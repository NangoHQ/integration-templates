import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const AccountLimitSchema = z.object({
    limitType: z.string(),
    limitValue: z.number(),
    currentValue: z.number()
});

const ProviderResponseSchema = z.object({
    pageSize: z.number(),
    pageNumber: z.number(),
    total: z.number(),
    results: z.array(AccountLimitSchema)
});

const OutputSchema = z.object({
    pageSize: z.number(),
    pageNumber: z.number(),
    total: z.number(),
    results: z.array(AccountLimitSchema)
});

const action = createAction({
    description: "Get the account's assigned resource limits (users, groups, permissions, platform tokens) and current usage against each.",
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,
    scopes: ['iam:limits:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataParse = MetadataSchema.safeParse(metadata);
        if (!metadataParse.success) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'Metadata accountUuid is required to call the Dynatrace Account Management API.'
            });
        }

        const accountUuid = metadataParse.data.accountUuid;

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/account-limits/get-account-limits
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/limits`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.safeParse(response.data);
        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Dynatrace API returned an unexpected response format for account limits.',
                details: providerData.error.issues
            });
        }

        return {
            pageSize: providerData.data.pageSize,
            pageNumber: providerData.data.pageNumber,
            total: providerData.data.total,
            results: providerData.data.results.map((limit) => ({
                limitType: limit.limitType,
                limitValue: limit.limitValue,
                currentValue: limit.currentValue
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
