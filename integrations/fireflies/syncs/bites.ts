import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    transcript_id: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    user_id: z.string().optional(),
    created_at: z.string().optional(),
    media_type: z.string().optional()
});

const ProviderBiteSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    transcript_id: z.string().nullable().optional(),
    start_time: z.union([z.string(), z.number()]).nullable().optional(),
    end_time: z.union([z.string(), z.number()]).nullable().optional(),
    status: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    user_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    media_type: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Full-refresh sync of soundbite clips.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/bites' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    models: {
        Bite: BiteSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /graphql bites with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Bite');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.fireflies.ai/graphql-api/query/bites
            endpoint: '/graphql',
            method: 'POST',
            data: {
                query: `query Bites($mine: Boolean!, $limit: Int!, $skip: Int!) {
                    bites(mine: $mine, limit: $limit, skip: $skip) {
                        id
                        transcript_id
                        name
                        start_time
                        end_time
                        status
                        summary
                        user_id
                        created_at
                        media_type
                    }
                }`,
                variables: {
                    mine: true,
                    limit: 50,
                    skip: 0
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.skip',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'variables.limit',
                limit: 50,
                response_path: 'data.bites'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const bites = [];
            for (const record of page) {
                const parsed = ProviderBiteSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid bite response: ${parsed.error.message}`);
                }

                const bite = parsed.data;
                bites.push({
                    id: bite.id,
                    ...(bite.name != null && { name: bite.name }),
                    ...(bite.transcript_id != null && { transcript_id: bite.transcript_id }),
                    ...(bite.start_time != null && { start_time: String(bite.start_time) }),
                    ...(bite.end_time != null && { end_time: String(bite.end_time) }),
                    ...(bite.status != null && { status: bite.status }),
                    ...(bite.summary != null && { summary: bite.summary }),
                    ...(bite.user_id != null && { user_id: bite.user_id }),
                    ...(bite.created_at != null && { created_at: bite.created_at }),
                    ...(bite.media_type != null && { media_type: bite.media_type })
                });
            }

            if (bites.length > 0) {
                await nango.batchSave(bites, 'Bite');
            }
        }

        await nango.trackDeletesEnd('Bite');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
