import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPolicySchema = z.object({
    policyName: z.string(),
    updatedAt: z.string(),
    sslInspection: z.string(),
    clashCount: z.number().optional()
});

const PolicySchema = z.object({
    id: z.string(),
    policyName: z.string(),
    updatedAt: z.string(),
    sslInspection: z.string(),
    clashCount: z.number().optional()
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
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
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
