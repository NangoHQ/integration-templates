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

const sync = createSync({
    description: 'Fetches all archive reasons configured on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ArchiveReason: ArchiveReasonSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('ArchiveReason');

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/archive_reasons',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'limit'
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
        }

        await nango.trackDeletesEnd('ArchiveReason');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
