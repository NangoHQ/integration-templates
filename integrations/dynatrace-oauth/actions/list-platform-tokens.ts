import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    searchTerm: z.string().optional(),
    status: z.string().optional(),
    page: z.number().optional(),
    size: z.number().optional()
});

const ConnectionSchema = z.object({
    connection_config: z.object({
        accountUuid: z.string()
    })
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const ProviderTokenMetadataSchema = z.object({
    lastUsedAt: z.string().nullish(),
    lastClientIp: z.string().nullish()
});

const ProviderTokenSchema = z.object({
    tokenId: z.string(),
    accountUuid: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    scope: z.array(z.string()).nullish(),
    tags: z.array(z.string()).nullish(),
    resource: z.array(z.string()).nullish(),
    expirationDate: z.string().nullish(),
    userUuid: z.string().nullish(),
    status: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    createdBy: z.string().nullish(),
    owner: z.string().nullish(),
    metadata: ProviderTokenMetadataSchema.nullish()
});

const ProviderResponseSchema = z.object({
    pageSize: z.number().nullish(),
    pageNumber: z.number().nullish(),
    total: z.number().nullish(),
    results: z.array(ProviderTokenSchema).nullish()
});

const OutputTokenMetadataSchema = z.object({
    lastUsedAt: z.string().optional(),
    lastClientIp: z.string().optional()
});

const OutputTokenSchema = z.object({
    tokenId: z.string(),
    accountUuid: z.string(),
    name: z.string(),
    description: z.string().optional(),
    scope: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    resource: z.array(z.string()).optional(),
    expirationDate: z.string().optional(),
    userUuid: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    createdBy: z.string().optional(),
    owner: z.string().optional(),
    metadata: OutputTokenMetadataSchema.optional()
});

const OutputSchema = z.object({
    pageSize: z.number().optional(),
    pageNumber: z.number().optional(),
    total: z.number().optional(),
    results: z.array(OutputTokenSchema).optional()
});

const action = createAction({
    description: 'List platform (OAuth-adjacent) tokens issued in this account, used to authenticate against environment-level Dynatrace Platform APIs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadataResult = MetadataSchema.safeParse(await nango.getMetadata());
        let accountUuid: string;
        if (metadataResult.success) {
            accountUuid = metadataResult.data.accountUuid;
        } else {
            const connection = ConnectionSchema.parse(await nango.getConnection());
            accountUuid = connection.connection_config.accountUuid;
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/platform-tokens-api/get-all-platform-tokens
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/platform-tokens`,
            params: {
                ...(input.searchTerm !== undefined && { searchTerm: input.searchTerm }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.size !== undefined && { size: input.size })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Empty response from Dynatrace API'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            pageSize: providerData.pageSize ?? undefined,
            pageNumber: providerData.pageNumber ?? undefined,
            total: providerData.total ?? undefined,
            results: (providerData.results || []).map((token) => {
                const metadata = token.metadata;
                return {
                    tokenId: token.tokenId,
                    accountUuid: token.accountUuid,
                    name: token.name,
                    ...(token.description != null && { description: token.description }),
                    ...(token.scope != null && { scope: token.scope }),
                    ...(token.tags != null && { tags: token.tags }),
                    ...(token.resource != null && { resource: token.resource }),
                    ...(token.expirationDate != null && { expirationDate: token.expirationDate }),
                    ...(token.userUuid != null && { userUuid: token.userUuid }),
                    ...(token.status != null && { status: token.status }),
                    ...(token.createdAt != null && { createdAt: token.createdAt }),
                    ...(token.updatedAt != null && { updatedAt: token.updatedAt }),
                    ...(token.createdBy != null && { createdBy: token.createdBy }),
                    ...(token.owner != null && { owner: token.owner }),
                    ...(metadata != null && {
                        metadata: {
                            ...(metadata.lastUsedAt != null && { lastUsedAt: metadata.lastUsedAt }),
                            ...(metadata.lastClientIp != null && { lastClientIp: metadata.lastClientIp })
                        }
                    })
                };
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
