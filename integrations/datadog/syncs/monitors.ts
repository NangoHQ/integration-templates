import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DatadogMonitorSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.string().optional(),
    query: z.string().optional(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    priority: z.number().nullable().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    overall_state: z.string().optional(),
    overall_state_modified: z.string().optional(),
    multi: z.boolean().optional(),
    creator: z
        .object({
            name: z.string().optional(),
            handle: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const MonitorSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    query: z.string().optional(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    priority: z.number().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    overall_state: z.string().optional(),
    overall_state_modified: z.string().optional(),
    multi: z.boolean().optional(),
    creator: z
        .object({
            name: z.string().optional(),
            handle: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    page_number: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync monitors (alerting rules) configured in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Monitor: MonitorSchema
    },

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let pageNumber = checkpoint?.page_number ?? 0;

        await nango.trackDeletesStart('Monitor');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/monitors/#get-all-monitor-details
            endpoint: '/v1/monitor',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: pageNumber,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawMonitors = z.array(DatadogMonitorSchema).safeParse(page);

            if (!rawMonitors.success) {
                throw new Error(`Failed to parse monitors: ${rawMonitors.error.message}`);
            }

            const monitors = rawMonitors.data.map((monitor) => ({
                id: String(monitor.id),
                ...(monitor.name != null && { name: monitor.name }),
                ...(monitor.type != null && { type: monitor.type }),
                ...(monitor.query != null && { query: monitor.query }),
                ...(monitor.message != null && { message: monitor.message }),
                ...(monitor.tags != null && { tags: monitor.tags }),
                ...(monitor.options != null && { options: monitor.options }),
                ...(monitor.priority != null && { priority: monitor.priority }),
                ...(monitor.created != null && { created: monitor.created }),
                ...(monitor.modified != null && { modified: monitor.modified }),
                ...(monitor.overall_state != null && { overall_state: monitor.overall_state }),
                ...(monitor.overall_state_modified != null && { overall_state_modified: monitor.overall_state_modified }),
                ...(monitor.multi != null && { multi: monitor.multi }),
                ...(monitor.creator != null && {
                    creator: {
                        ...(monitor.creator.name != null && { name: monitor.creator.name }),
                        ...(monitor.creator.handle != null && { handle: monitor.creator.handle }),
                        ...(monitor.creator.email != null && { email: monitor.creator.email })
                    }
                })
            }));

            if (monitors.length > 0) {
                await nango.batchSave(monitors, 'Monitor');
                pageNumber += 1;
                await nango.saveCheckpoint({ page_number: pageNumber });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Monitor');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
