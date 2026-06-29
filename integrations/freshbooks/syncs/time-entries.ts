import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TimeEntrySchema = z.object({
    id: z.string(),
    note: z.string().optional(),
    duration: z.number().optional(),
    project_id: z.number().optional(),
    client_id: z.number().optional(),
    identity_id: z.number().optional(),
    is_logged: z.boolean().optional(),
    started_at: z.string().optional(),
    active: z.boolean().optional(),
    billable: z.boolean().optional(),
    billed: z.boolean().optional(),
    internal: z.boolean().optional(),
    timer_id: z.number().optional(),
    timer_is_running: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()])
});

const ProviderTimeEntrySchema = z.object({
    id: z.number(),
    note: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    client_id: z.number().nullable().optional(),
    identity_id: z.number().nullable().optional(),
    is_logged: z.boolean().optional(),
    started_at: z.string().optional(),
    active: z.boolean().optional(),
    billable: z.boolean().optional(),
    billed: z.boolean().optional(),
    internal: z.boolean().optional(),
    timer: z
        .object({
            id: z.number(),
            is_running: z.boolean()
        })
        .nullable()
        .optional()
});

const sync = createSync({
    description: 'Sync time entries.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        TimeEntry: TimeEntrySchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.businessId) {
            throw new Error('businessId is required in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const syncStartTime = new Date().toISOString();
        const params: Record<string, string> = {};
        if (checkpoint?.updated_after) {
            params['updated_since'] = checkpoint.updated_after;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.freshbooks.com/api/time_entries
            endpoint: `/timetracking/business/${encodeURIComponent(String(metadata.businessId))}/time_entries`,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 30,
                response_path: 'time_entries'
            },
            retries: 3
        };

        let hasEntries = false;

        for await (const page of nango.paginate(proxyConfig)) {
            const validated = z.array(ProviderTimeEntrySchema).safeParse(page);
            if (!validated.success) {
                throw new Error(`Invalid time entry response: ${validated.error.message}`);
            }

            const timeEntries = validated.data.map((entry) => ({
                id: String(entry.id),
                ...(entry.note != null && { note: entry.note }),
                ...(entry.duration != null && { duration: entry.duration }),
                ...(entry.project_id != null && { project_id: entry.project_id }),
                ...(entry.client_id != null && { client_id: entry.client_id }),
                ...(entry.identity_id != null && { identity_id: entry.identity_id }),
                ...(entry.is_logged !== undefined && { is_logged: entry.is_logged }),
                ...(entry.started_at != null && { started_at: entry.started_at }),
                ...(entry.active !== undefined && { active: entry.active }),
                ...(entry.billable !== undefined && { billable: entry.billable }),
                ...(entry.billed !== undefined && { billed: entry.billed }),
                ...(entry.internal !== undefined && { internal: entry.internal }),
                ...(entry.timer != null && {
                    timer_id: entry.timer.id,
                    timer_is_running: entry.timer.is_running
                })
            }));

            if (timeEntries.length === 0) {
                continue;
            }

            await nango.batchSave(timeEntries, 'TimeEntry');
            hasEntries = true;
        }

        if (hasEntries) {
            await nango.saveCheckpoint({
                updated_after: syncStartTime
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
