import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPolicySchema = z.object({
    policyName: z.string(),
    updatedAt: z.string(),
    sslInspection: z.enum(['enabled', 'disabled']),
    clashCount: z.number().optional()
});

const PolicySchema = z.object({
    id: z.string(),
    policyName: z.string(),
    updatedAt: z.string(),
    sslInspection: z.enum(['enabled', 'disabled']),
    clashCount: z.number().optional()
});

const PageInfoSchema = z.object({
    endCursor: z.string().nullable().optional(),
    hasNextPage: z.boolean()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync policies.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Policy: PolicySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextCursor = typeof checkpoint?.['cursor'] === 'string' ? checkpoint['cursor'] : undefined;

        // The policies endpoint paginates by policy name, not updatedAt, so a
        // timestamp checkpoint would not change the provider request or resume
        // state. Keep this as a full refresh with delete tracking and use the
        // cursor checkpoint only to resume an interrupted crawl.
        await nango.trackDeletesStart('Policy');

        const proxyConfig: ProxyConfiguration = {
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: '/v1/policies',
            params: {
                order: 'asc',
                ...(nextCursor !== undefined ? { after: nextCursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'data.pageInfo.endCursor',
                response_path: 'data.policies',
                limit_name_in_request: 'first',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    const parsedResponse = z.object({ data: z.object({ pageInfo: PageInfoSchema }) }).parse(response.data);
                    const pageInfo = parsedResponse.data.pageInfo;
                    const hasCursor = typeof nextPageParam === 'string' && nextPageParam.length > 0;
                    // A final page can still carry a non-null endCursor (e.g. pointing at the
                    // last item), so only the inverse is a real problem: hasNextPage=true with
                    // no cursor would silently end pagination early and lose data.
                    if (pageInfo.hasNextPage && !hasCursor) {
                        throw new Error('Inconsistent pageInfo from provider: hasNextPage=true but no endCursor was returned');
                    }
                    nextCursor = hasCursor ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from provider');
            }

            const policies = [];
            for (const raw of page) {
                const parsed = ProviderPolicySchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid policy record: ${parsed.error.message}`);
                }

                policies.push({
                    id: parsed.data.policyName,
                    policyName: parsed.data.policyName,
                    updatedAt: parsed.data.updatedAt,
                    sslInspection: parsed.data.sslInspection,
                    clashCount: parsed.data.clashCount
                });
            }

            if (policies.length > 0) {
                await nango.batchSave(policies, 'Policy');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({
                    cursor: nextCursor
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Policy');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
