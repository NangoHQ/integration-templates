import { createSync } from 'nango';
import { z } from 'zod';

const PlatformTokenMetadataSchema = z.object({
    lastUsedAt: z.string().nullable().optional(),
    lastClientIp: z.string().nullable().optional()
});

const ProviderPlatformTokenSchema = z.object({
    tokenId: z.string(),
    accountUuid: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    scope: z.array(z.string()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    resource: z.array(z.string()).nullable().optional(),
    status: z.string().nullable().optional(),
    expirationDate: z.string().nullable().optional(),
    userUuid: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
    metadata: PlatformTokenMetadataSchema.nullable().optional()
});

const PlatformTokenModelSchema = z.object({
    id: z.string(),
    tokenId: z.string(),
    accountUuid: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    scope: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    resource: z.array(z.string()).optional(),
    status: z.string().optional(),
    expirationDate: z.string().optional(),
    userUuid: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    createdBy: z.string().optional(),
    owner: z.string().optional(),
    metadata_lastUsedAt: z.string().optional(),
    metadata_lastClientIp: z.string().optional()
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const CheckpointSchema = z.object({
    nextPage: z.number().int().min(1)
});

const ProviderPlatformTokensResponseSchema = z.object({
    pageSize: z.number().int().positive().optional(),
    pageNumber: z.number().int().positive().optional(),
    total: z.number().int().nonnegative().optional(),
    results: z.array(ProviderPlatformTokenSchema)
});

const sync = createSync({
    description: 'Sync platform token metadata (never the plaintext secret, which is only ever returned once at creation) issued in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    trackDeletes: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        PlatformToken: PlatformTokenModelSchema
    },

    exec: async (nango) => {
        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/platform-tokens-api/get-all-platform-tokens
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Failed to parse metadata: missing accountUuid');
        }
        const accountUuid = parsedMetadata.data.accountUuid;
        const checkpoint = await nango.getCheckpoint();
        const requestedPageSize = 100;
        const isFreshRun = checkpoint?.nextPage == null;
        let nextPage = checkpoint?.nextPage ?? 1;

        // Dynatrace only exposes page/size pagination here, so we checkpoint the
        // next page for mid-run recovery and clear it after a complete full refresh.
        let isFirstIteration = true;

        while (true) {
            const response = await nango.get({
                endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/platform-tokens`,
                params: {
                    page: nextPage,
                    size: requestedPageSize
                },
                retries: 3
            });

            const parsedResponse = ProviderPlatformTokensResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse platform tokens response: ${parsedResponse.error.message}`);
            }

            // Only (re)start delete-tracking once, after the first page of a fresh full
            // refresh has been fetched and validated. A resumed run (checkpoint present)
            // preserves the tracking window already opened by the run it's resuming.
            if (isFirstIteration && isFreshRun) {
                await nango.trackDeletesStart('PlatformToken');
            }
            isFirstIteration = false;

            const currentPage = parsedResponse.data.pageNumber ?? nextPage;
            const currentPageSize = parsedResponse.data.pageSize ?? requestedPageSize;
            const tokens = parsedResponse.data.results.map((record) => {
                const metadata = record.metadata;
                return {
                    id: record.tokenId,
                    tokenId: record.tokenId,
                    ...(record.accountUuid != null && { accountUuid: record.accountUuid }),
                    ...(record.name != null && { name: record.name }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.scope != null && { scope: record.scope }),
                    ...(record.tags != null && { tags: record.tags }),
                    ...(record.resource != null && { resource: record.resource }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.expirationDate != null && { expirationDate: record.expirationDate }),
                    ...(record.userUuid != null && { userUuid: record.userUuid }),
                    ...(record.createdAt != null && { createdAt: record.createdAt }),
                    ...(record.updatedAt != null && { updatedAt: record.updatedAt }),
                    ...(record.createdBy != null && { createdBy: record.createdBy }),
                    ...(record.owner != null && { owner: record.owner }),
                    ...(metadata?.lastUsedAt != null && { metadata_lastUsedAt: metadata.lastUsedAt }),
                    ...(metadata?.lastClientIp != null && { metadata_lastClientIp: metadata.lastClientIp })
                };
            });

            if (tokens.length > 0) {
                await nango.batchSave(tokens, 'PlatformToken');
            }

            const hasMore = parsedResponse.data.total != null ? currentPage * currentPageSize < parsedResponse.data.total : tokens.length === currentPageSize;

            if (!hasMore) {
                break;
            }

            if (tokens.length === 0) {
                throw new Error(`Platform tokens pagination reported more pages after page ${currentPage}, but no results were returned.`);
            }

            nextPage = currentPage + 1;
            await nango.saveCheckpoint({ nextPage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('PlatformToken');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
