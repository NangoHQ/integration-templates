import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DailyLogSchema = z
    .object({
        id: z.string(),
        project_id: z.string(),
        status: z.string(),
        date: z.string(),
        reported_by_id: z.string(),
        responsible_contractor_id: z.string(),
        total_hours: z.number().nullable().optional(),
        total_delay_hours: z.number().nullable().optional(),
        person_count: z.number().nullable().optional(),
        safety_incidents_count: z.number(),
        safety_violations_count: z.number(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync daily field logs across projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DailyLog: DailyLogSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: provider only exposes /api/v2/pub/daily-logs with no reliable
        // changed-since filter for incremental sync, no deleted-record endpoint,
        // and no resumable cursor. Resume the current full scan by page instead.
        if (nextPage === 1) {
            await nango.trackDeletesStart('DailyLog');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/v2-list-daily-logs.md
            endpoint: '/api/v2/pub/daily-logs',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const rawPage of nango.paginate(proxyConfig)) {
            if (!Array.isArray(rawPage)) {
                throw new Error('Expected daily logs paginate result to be an array');
            }

            const logs: Array<z.infer<typeof DailyLogSchema>> = [];
            for (const raw of rawPage) {
                const parsed = DailyLogSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse daily log: ${parsed.error.message}`);
                }
                logs.push(parsed.data);
            }

            if (logs.length > 0) {
                await nango.batchSave(logs, 'DailyLog');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DailyLog');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
