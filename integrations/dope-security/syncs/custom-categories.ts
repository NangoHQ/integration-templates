import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    urls: z.array(z.string())
});

const PageInfoSchema = z.object({
    endCursor: z.string().nullable().optional(),
    hasNextPage: z.boolean()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync custom categories and their URLs',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CustomCategory: CustomCategorySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextCursor = typeof checkpoint?.['cursor'] === 'string' ? checkpoint['cursor'] : undefined;

        // The list endpoint only returns category names, so this stays a full
        // refresh with delete tracking. Use the cursor checkpoint only to resume
        // an interrupted crawl instead of restarting from page one.
        // https://inflight.dope.security/dope.apis/public-api-specification
        await nango.trackDeletesStart('CustomCategory');

        const proxyConfig: ProxyConfiguration = {
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: '/v1/custom_categories',
            params: {
                ...(nextCursor !== undefined ? { after: nextCursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'data.pageInfo.endCursor',
                response_path: 'data.customCategories',
                limit_name_in_request: 'first',
                limit: 50,
                on_page: async ({ nextPageParam, response }) => {
                    const parsedResponse = z.object({ data: z.object({ pageInfo: PageInfoSchema }) }).parse(response.data);
                    const pageInfo = parsedResponse.data.pageInfo;
                    const hasCursor = typeof nextPageParam === 'string' && nextPageParam.length > 0;
                    if (pageInfo.hasNextPage !== hasCursor) {
                        throw new Error(
                            `Inconsistent pageInfo from provider: hasNextPage=${pageInfo.hasNextPage} but endCursor=${JSON.stringify(pageInfo.endCursor)}`
                        );
                    }
                    nextCursor = typeof nextPageParam === 'string' && nextPageParam.length > 0 ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const names of nango.paginate(proxyConfig)) {
            if (!Array.isArray(names)) {
                throw new Error('Unexpected non-array response for custom categories page');
            }

            const categories: Array<{ id: string; name: string; urls: string[] }> = [];

            for (const rawName of names) {
                if (typeof rawName !== 'string') {
                    throw new Error(`Unexpected non-string custom category name: ${JSON.stringify(rawName)}`);
                }

                // https://inflight.dope.security/dope.apis/public-api-specification
                const urlsResponse = await nango.get({
                    endpoint: `/v1/custom_categories/${encodeURIComponent(rawName)}/urls`,
                    retries: 3
                });

                const parsed = z
                    .object({
                        data: z.object({
                            urls: z.array(z.string())
                        })
                    })
                    .safeParse(urlsResponse.data);

                if (!parsed.success) {
                    throw new Error(`Failed to parse URLs for custom category ${rawName}: ${parsed.error.message}`);
                }

                categories.push({
                    id: rawName,
                    name: rawName,
                    urls: parsed.data.data.urls
                });
            }

            if (categories.length > 0) {
                await nango.batchSave(categories, 'CustomCategory');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({
                    cursor: nextCursor
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CustomCategory');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
