import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_WINDOW_DAYS = 7;
const MAX_WINDOW_MS = MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function toIsoString(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const ProviderOrganizationSchema = z.object({
    id: z.union([z.string(), z.number()])
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
    window_start: z.string()
});

function extractArray(data: unknown, key: string): unknown[] {
    const asArray = z.array(z.unknown()).safeParse(data);
    if (asArray.success) {
        return asArray.data;
    }

    const asObject = z.object({ [key]: z.array(z.unknown()).optional() }).safeParse(data);
    if (asObject.success) {
        return asObject.data[key] ?? [];
    }

    throw new Error(`Response is neither an array nor an object with a ${key} field`);
}

const sync = createSync({
    description: 'Sync tracked-time activity records (10-minute slots) for an organization.',
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
        if (checkpointResult !== null && !checkpointResult.success) {
            throw new Error('Invalid checkpoint shape');
        }
        const checkpoint = checkpointResult?.data;

        const orgsConfig: ProxyConfiguration = {
            // https://developer.hubstaff.com/
            endpoint: 'v2/organizations',
            retries: 3
        };
        const orgsResponse = await nango.get(orgsConfig);
        const orgs = extractArray(orgsResponse.data, 'organizations');

        if (orgs.length === 0) {
            throw new Error('No organizations found for this connection');
        }

        const firstOrgResult = ProviderOrganizationSchema.safeParse(orgs[0]);
        if (!firstOrgResult.success) {
            throw new Error('Failed to parse organization');
        }

        const organizationId = String(firstOrgResult.data.id);

        let windowStart: Date;
        if (checkpoint?.window_start) {
            windowStart = new Date(checkpoint.window_start);
        } else {
            windowStart = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
            windowStart.setUTCHours(0, 0, 0, 0);
        }

        const now = new Date();
        now.setUTCMinutes(0, 0, 0);

        while (windowStart.getTime() < now.getTime()) {
            let windowStop = new Date(windowStart.getTime() + MAX_WINDOW_MS);
            if (windowStop.getTime() > now.getTime()) {
                windowStop = now;
            }

            const startIso = toIsoString(windowStart);
            const stopIso = toIsoString(windowStop);

            const activitiesConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/organizations/${encodeURIComponent(organizationId)}/activities`,
                params: {
                    'time_slot[start]': startIso,
                    'time_slot[stop]': stopIso
                },
                retries: 3
            };
            const activitiesResponse = await nango.get(activitiesConfig);
            const rawActivities = extractArray(activitiesResponse.data, 'activities');

            const activities = [];
            for (const raw of rawActivities) {
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

            await nango.saveCheckpoint({
                window_start: stopIso
            });

            windowStart = windowStop;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
