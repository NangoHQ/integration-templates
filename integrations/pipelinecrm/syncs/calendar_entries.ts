import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CalendarEntryResponseSchema = z.object({
    id: z.union([z.string(), z.number()]),
    type: z.string(),
    name: z.string().optional().nullable(),
    active: z.boolean(),
    complete: z.boolean().optional().nullable(),
    updated_at: z.string(),
    created_at: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    start_time: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    association_type: z.string().optional().nullable(),
    association_id: z.union([z.string(), z.number()]).optional().nullable(),
    owner_id: z.union([z.string(), z.number()]).optional().nullable()
});

const CalendarEntryModelSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    active: z.boolean(),
    complete: z.boolean().optional(),
    updated_at: z.string(),
    created_at: z.string().optional(),
    due_date: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    association_type: z.string().optional(),
    association_id: z.string().optional(),
    owner_id: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number()
});

const sync = createSync({
    description: 'Sync calendar entries (Tasks + Events) across the account',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CalendarEntry: CalendarEntryModelSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const isFirstRun = !checkpointResult.success;
        const syncStartTime = new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\.\d+Z$/, '');
        let page: number | undefined = isFirstRun ? 1 : (checkpointResult.data.page ?? 1);

        const params: Record<string, string | number> = {
            page: page,
            per_page: 100
        };

        if (checkpointResult.success) {
            params['conditions%5Bcalendar_entry_modified%5D%5Bfrom_date%5D'] = checkpointResult.data.updated_after;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/calendar_entries',
            baseUrlOverride: 'https://api.pipelinecrm.com/api/v3',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'entries',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        if (isFirstRun) {
            await nango.trackDeletesStart('CalendarEntry');
        }

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const upserts = [];
            const deletions = [];

            for (const raw of pageResults) {
                const parsed = CalendarEntryResponseSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse calendar entry: ${parsed.error.message}`);
                }

                const entry = parsed.data;
                const model = {
                    id: String(entry.id),
                    type: entry.type,
                    ...(entry.name != null && { name: entry.name }),
                    active: entry.active,
                    ...(entry.complete != null && { complete: entry.complete }),
                    updated_at: entry.updated_at,
                    ...(entry.created_at != null && { created_at: entry.created_at }),
                    ...(entry.due_date != null && { due_date: entry.due_date }),
                    ...(entry.start_time != null && { start_time: entry.start_time }),
                    ...(entry.end_time != null && { end_time: entry.end_time }),
                    ...(entry.association_type != null && { association_type: entry.association_type }),
                    ...(entry.association_id != null && { association_id: String(entry.association_id) }),
                    ...(entry.owner_id != null && { owner_id: String(entry.owner_id) })
                };

                if (!entry.active) {
                    deletions.push({ id: String(entry.id) });
                } else {
                    upserts.push(model);
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'CalendarEntry');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'CalendarEntry');
            }

            if (checkpointResult.success && page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: checkpointResult.data.updated_after,
                    page: page
                });
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('CalendarEntry');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartTime,
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
