import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OktaAppSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        label: z.string(),
        status: z.string(),
        lastUpdated: z.string(),
        created: z.string(),
        signOnMode: z.string().optional().nullable(),
        features: z.array(z.string()).optional().nullable()
    })
    .passthrough();

const ApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    status: z.string(),
    lastUpdated: z.string(),
    created: z.string(),
    signOnMode: z.string().optional(),
    features: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    next_page_url: z.string()
});

const sync = createSync({
    description: 'Sync applications.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Application: ApplicationSchema
    },

    exec: async (nango) => {
        // Blocker: Okta /api/v1/apps does not support a changed-since filter, deleted-record
        // endpoint, or resumable cursor for changed rows. Full snapshot with delete tracking
        // is required.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const resumeUrl = checkpoint.success ? checkpoint.data.next_page_url : undefined;

        let nextPageUrl: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/apps/
            endpoint: '/api/v1/apps',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 200,
                on_page: async ({ nextPageParam }) => {
                    nextPageUrl = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        if (resumeUrl) {
            try {
                const url = new URL(resumeUrl);
                proxyConfig.baseUrlOverride = url.origin;
                proxyConfig.endpoint = url.pathname + url.search;
            } catch {
                throw new Error(`Invalid next_page_url in checkpoint: ${resumeUrl}`);
            }
        } else {
            proxyConfig.params = { limit: 200 };
        }

        await nango.trackDeletesStart('Application');

        for await (const page of nango.paginate(proxyConfig)) {
            const mapped = page.map((record) => {
                const parsed = OktaAppSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse application: ${parsed.error.message}`);
                }
                const app = parsed.data;
                return {
                    id: app.id,
                    name: app.name,
                    label: app.label,
                    status: app.status,
                    lastUpdated: app.lastUpdated,
                    created: app.created,
                    ...(app.signOnMode != null && { signOnMode: app.signOnMode }),
                    ...(app.features != null && { features: app.features })
                };
            });

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Application');
            }

            if (nextPageUrl) {
                await nango.saveCheckpoint({ next_page_url: nextPageUrl });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Application');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
