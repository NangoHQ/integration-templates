import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderJobSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    full_title: z.string().nullish(),
    shortcode: z.string().nullish(),
    code: z.string().nullish(),
    state: z.string().nullish(),
    confidential: z.boolean().nullish(),
    department: z.string().nullish(),
    url: z.string().nullish(),
    application_url: z.string().nullish(),
    shortlink: z.string().nullish(),
    workplace_type: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const JobSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    full_title: z.string().optional(),
    shortcode: z.string().optional(),
    code: z.string().optional(),
    state: z.string().optional(),
    confidential: z.boolean().optional(),
    department: z.string().optional(),
    url: z.string().optional(),
    application_url: z.string().optional(),
    shortlink: z.string().optional(),
    workplace_type: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync account jobs',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Job: JobSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { updated_after: '' });
        const updatedAfter = checkpoint.updated_after || undefined;
        let maxUpdatedAt = updatedAfter;

        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/jobs
            endpoint: '/spi/v3/jobs',
            params: {
                limit: 100,
                ...(updatedAfter && { updated_after: updatedAfter })
            },
            paginate: {
                type: 'link',
                limit: 100,
                response_path: 'jobs',
                link_path_in_response_body: 'paging.next',
                limit_name_in_request: 'limit'
            },
            retryOn: [404, 429],
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const jobs = [];
            for (const item of batch) {
                const parsed = ProviderJobSchema.parse(item);
                jobs.push({
                    id: parsed.id,
                    ...(parsed.title != null && { title: parsed.title }),
                    ...(parsed.full_title != null && { full_title: parsed.full_title }),
                    ...(parsed.shortcode != null && { shortcode: parsed.shortcode }),
                    ...(parsed.code != null && { code: parsed.code }),
                    ...(parsed.state != null && { state: parsed.state }),
                    ...(parsed.confidential != null && { confidential: parsed.confidential }),
                    ...(parsed.department != null && { department: parsed.department }),
                    ...(parsed.url != null && { url: parsed.url }),
                    ...(parsed.application_url != null && { application_url: parsed.application_url }),
                    ...(parsed.shortlink != null && { shortlink: parsed.shortlink }),
                    ...(parsed.workplace_type != null && { workplace_type: parsed.workplace_type }),
                    ...(parsed.created_at != null && { created_at: parsed.created_at }),
                    ...(parsed.updated_at != null && { updated_at: parsed.updated_at })
                });
                if (parsed.updated_at && (!maxUpdatedAt || parsed.updated_at > maxUpdatedAt)) {
                    maxUpdatedAt = parsed.updated_at;
                }
            }

            if (jobs.length === 0) {
                continue;
            }

            await nango.batchSave(jobs, 'Job');
        }

        if (maxUpdatedAt && maxUpdatedAt !== updatedAfter) {
            await nango.saveCheckpoint({
                updated_after: maxUpdatedAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
