import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.clickup.com/reference/gettimeentrieswithinadaterange
const ProviderTimeEntrySchema = z.object({
    id: z.string(),
    start: z.string(),
    end: z.string(),
    duration: z.string(),
    description: z.string().optional(),
    user: z
        .object({
            id: z.number(),
            username: z.string().optional(),
            email: z.string().optional(),
            color: z.string().optional(),
            profilePicture: z.string().optional()
        })
        .optional(),
    task: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            status: z
                .object({
                    status: z.string().optional(),
                    color: z.string().optional(),
                    orderindex: z.number().optional()
                })
                .optional()
        })
        .optional()
});

const TimeEntrySchema = z.object({
    id: z.string(),
    start: z.string(),
    end: z.string(),
    duration: z.string(),
    description: z.string().optional(),
    user_id: z.number().optional(),
    user_username: z.string().optional(),
    user_email: z.string().optional(),
    task_id: z.string().optional(),
    task_name: z.string().optional()
});

const CheckpointSchema = z.object({
    start_date: z.number()
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CHECKPOINT_OVERLAP_MS = 1;
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync time entries from ClickUp',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/time-entries' }],
    frequency: 'every 30 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        TimeEntry: TimeEntrySchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.team_id) {
            await nango.log('Missing team_id in metadata');
            throw new Error('Missing required metadata: team_id');
        }

        const teamId = metadata.team_id;
        const checkpoint = await nango.getCheckpoint();

        // Align to the sync cadence so incremental windows stay stable between
        // dryrun fixture capture and test execution.
        const now = alignToSyncWindow(Date.now());
        const defaultStartDate = now - THIRTY_DAYS_MS;
        let checkpointStartDate = checkpoint?.start_date ?? defaultStartDate;

        if (checkpointStartDate > now) {
            await nango.log('Checkpoint start_date is in the future, resetting to a rolling lookback window', {
                level: 'warn',
                checkpoint_start_date: checkpointStartDate,
                now
            });
            checkpointStartDate = defaultStartDate;
        }

        const startDate = Math.max(0, checkpointStartDate - (checkpoint ? CHECKPOINT_OVERLAP_MS : 0));
        const endDate = Math.min(startDate + THIRTY_DAYS_MS, now);

        // https://developer.clickup.com/reference/gettimeentrieswithinadaterange
        const response = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/time_entries`,
            params: {
                start_date: String(startDate),
                end_date: String(endDate)
            },
            retries: 3
        });

        const parsedData = z.object({ data: z.array(ProviderTimeEntrySchema) }).safeParse(response.data);

        if (!parsedData.success) {
            await nango.log('Failed to parse time entries response', { error: parsedData.error.message });
            throw new Error(`Invalid response format: ${parsedData.error.message}`);
        }

        const entries = parsedData.data.data;

        if (entries.length === 0) {
            await nango.log('No time entries found in window', { start_date: startDate, end_date: endDate });
            await nango.saveCheckpoint({ start_date: endDate });
            return;
        }

        const timeEntries = entries.map((entry) => ({
            id: entry.id,
            start: entry.start,
            end: entry.end,
            duration: entry.duration,
            ...(entry.description != null && { description: entry.description }),
            ...(entry.user?.id != null && { user_id: entry.user.id }),
            ...(entry.user?.username != null && { user_username: entry.user.username }),
            ...(entry.user?.email != null && { user_email: entry.user.email }),
            ...(entry.task?.id != null && { task_id: entry.task.id }),
            ...(entry.task?.name != null && { task_name: entry.task.name })
        }));

        // ClickUp only exposes time entries for a bounded date window, not the
        // full collection or a deleted-record feed, so deletion tracking would
        // be unsafe on incremental runs.
        await nango.batchSave(timeEntries, 'TimeEntry');

        // Save the end_date as the next checkpoint start_date
        await nango.saveCheckpoint({ start_date: endDate });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

function alignToSyncWindow(timestamp: number): number {
    return Math.floor(timestamp / SYNC_INTERVAL_MS) * SYNC_INTERVAL_MS;
}

export default sync;
