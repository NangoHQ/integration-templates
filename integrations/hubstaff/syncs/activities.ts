import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_WINDOW_DAYS = 7;
const MAX_WINDOW_MS = MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function toIsoString(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function defaultWindowStart(): Date {
    const start = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);
    return start;
}

const OrganizationSchema = z.object({
    id: z.number()
});

const ProviderActivitySchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        user_id: z.number().nullish(),
        project_id: z.number().nullish(),
        task_id: z.number().nullish(),
        organization_id: z.number().nullish(),
        time_slot: z.union([z.string(), z.object({ start: z.string().nullish(), stop: z.string().nullish() })]).nullish(),
        tracked: z.number().nullish()
    })
    .passthrough();

const ActivitySchema = z.object({
    id: z.string(),
    user_id: z.number().optional(),
    project_id: z.number().optional(),
    task_id: z.number().optional(),
    organization_id: z.number().optional(),
    time_slot_start: z.string().optional(),
    time_slot_stop: z.string().optional(),
    tracked: z.number().optional()
});

const CheckpointSchema = z.object({
    windows_json: z.string()
});

const WindowsMapSchema = z.record(z.string(), z.string());

function parseWindowsJson(windowsJson: string): Record<string, string> {
    // @allowTryCatch A corrupted or unparseable checkpoint must not permanently stall the sync;
    // self-heal by restarting all organizations from the default lookback window instead of throwing.
    try {
        const parsed = WindowsMapSchema.safeParse(JSON.parse(windowsJson));
        return parsed.success ? parsed.data : {};
    } catch {
        return {};
    }
}

const sync = createSync({
    description: 'Sync tracked-time activity records (10-minute slots) across all organizations this connection can access.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Activity: ActivitySchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint === null || rawCheckpoint === undefined ? null : CheckpointSchema.safeParse(rawCheckpoint);
        const windows: Record<string, string> = checkpointResult?.success ? parseWindowsJson(checkpointResult.data.windows_json) : {};

        const orgsProxyConfig: ProxyConfiguration = {
            // https://developer.hubstaff.com/
            endpoint: 'v2/organizations',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_start_id',
                cursor_path_in_response: 'pagination.next_page_start_id',
                response_path: 'organizations',
                limit_name_in_request: 'page_limit',
                limit: 100
            },
            retries: 3
        };

        const orgIds: string[] = [];
        for await (const orgsPage of nango.paginate(orgsProxyConfig)) {
            for (const rawOrg of orgsPage) {
                const parsed = OrganizationSchema.safeParse(rawOrg);
                if (!parsed.success) {
                    throw new Error(`Failed to parse organization: ${parsed.error.message}`);
                }
                orgIds.push(String(parsed.data.id));
            }
        }

        if (orgIds.length === 0) {
            throw new Error('No organizations found for this connection');
        }

        const now = new Date();
        now.setUTCMinutes(0, 0, 0);

        for (const organizationId of orgIds) {
            const storedWindowStart = windows[organizationId] ? new Date(windows[organizationId]) : defaultWindowStart();
            let windowStart = isNaN(storedWindowStart.getTime()) ? defaultWindowStart() : storedWindowStart;

            while (windowStart.getTime() < now.getTime()) {
                let windowStop = new Date(windowStart.getTime() + MAX_WINDOW_MS);
                if (windowStop.getTime() > now.getTime()) {
                    windowStop = now;
                }

                const startIso = toIsoString(windowStart);
                const stopIso = toIsoString(windowStop);

                const activitiesProxyConfig: ProxyConfiguration = {
                    // https://developer.hubstaff.com/
                    endpoint: `v2/organizations/${encodeURIComponent(organizationId)}/activities`,
                    params: {
                        'time_slot[start]': startIso,
                        'time_slot[stop]': stopIso
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'page_start_id',
                        cursor_path_in_response: 'pagination.next_page_start_id',
                        response_path: 'activities',
                        limit_name_in_request: 'page_limit',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const activitiesPage of nango.paginate(activitiesProxyConfig)) {
                    const activities: z.infer<typeof ActivitySchema>[] = [];
                    for (const raw of activitiesPage) {
                        const parsed = ProviderActivitySchema.safeParse(raw);
                        if (!parsed.success) {
                            throw new Error('Failed to parse activity record');
                        }

                        const record = parsed.data;

                        let timeSlotStart: string | undefined;
                        let timeSlotStop: string | undefined;
                        if (typeof record.time_slot === 'string') {
                            timeSlotStart = record.time_slot;
                        } else if (record.time_slot !== null && record.time_slot !== undefined) {
                            timeSlotStart = record.time_slot.start ?? undefined;
                            timeSlotStop = record.time_slot.stop ?? undefined;
                        }

                        activities.push({
                            id: String(record.id),
                            ...(record.user_id != null && { user_id: record.user_id }),
                            ...(record.project_id != null && { project_id: record.project_id }),
                            ...(record.task_id != null && { task_id: record.task_id }),
                            ...(record.organization_id != null && { organization_id: record.organization_id }),
                            ...(timeSlotStart !== undefined && { time_slot_start: timeSlotStart }),
                            ...(timeSlotStop !== undefined && { time_slot_stop: timeSlotStop }),
                            ...(record.tracked != null && { tracked: record.tracked })
                        });
                    }

                    if (activities.length > 0) {
                        await nango.batchSave(activities, 'Activity');
                    }
                }

                windows[organizationId] = stopIso;
                await nango.saveCheckpoint({ windows_json: JSON.stringify(windows) });

                windowStart = windowStop;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
