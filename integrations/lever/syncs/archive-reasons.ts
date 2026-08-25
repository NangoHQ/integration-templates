import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ArchiveReasonSchema = z.object({
    id: z.string(),
    text: z.string().optional()
});

const ProviderArchiveReasonSchema = z.object({
    id: z.string(),
    text: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Fetches all archive reasons configured on the account.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ArchiveReason: ArchiveReasonSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let offset = checkpoint?.offset ?? '';

        await nango.trackDeletesStart('ArchiveReason');

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/archive_reasons',
            params: {
                ...(offset ? { offset } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'limit',
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderArchiveReasonSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse archive reasons: ${parsed.error.message}`);
            }

            const reasons = parsed.data.map((record) => ({
                id: record.id,
                ...(record.text != null && { text: record.text })
            }));

            if (reasons.length > 0) {
                await nango.batchSave(reasons, 'ArchiveReason');
            }

            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ArchiveReason');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
