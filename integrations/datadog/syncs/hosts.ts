import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const HostModelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    host_name: z.string().optional(),
    up: z.boolean().optional(),
    last_reported_time: z.number().optional(),
    tags: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional()
});

const HostProviderSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    host_name: z.string().optional(),
    up: z.boolean().optional(),
    last_reported_time: z.number().optional(),
    tags: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    start: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync hosts reporting into this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Host: HostModelSchema
    },

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let start = checkpoint?.start ?? 0;

        // Full refresh: this endpoint paginates, so we can resume by offset,
        // but it still has no changed-since filter or deleted-record endpoint.
        await nango.trackDeletesStart('Host');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/hosts/
            endpoint: 'v1/hosts',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start',
                offset_start_value: start,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'host_list'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const hosts = page.map((item) => {
                const parsed = HostProviderSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse host: ${parsed.error.message}`);
                }
                const h = parsed.data;
                return {
                    id: String(h.id),
                    ...(h.name != null && { name: h.name }),
                    ...(h.host_name != null && { host_name: h.host_name }),
                    ...(h.up !== undefined && { up: h.up }),
                    ...(h.last_reported_time !== undefined && { last_reported_time: h.last_reported_time }),
                    ...(h.tags != null && { tags: h.tags }),
                    ...(h.aliases != null && { aliases: h.aliases })
                };
            });

            if (hosts.length > 0) {
                await nango.batchSave(hosts, 'Host');
                start += hosts.length;
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Host');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
