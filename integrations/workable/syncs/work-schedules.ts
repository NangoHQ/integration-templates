import { createSync } from 'nango';
import { z } from 'zod';

const WorkIntervalSchema = z.object({
    from_time: z.string(),
    to_time: z.string()
});

const WorkDaySchema = z.object({
    day_of_week: z.string(),
    work_hours: z.string(),
    break_duration: z.string(),
    work_intervals: z.array(WorkIntervalSchema),
    break_intervals: z.array(WorkIntervalSchema).optional()
});

const WorkScheduleSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    work_days: z.array(WorkDaySchema),
    week_starts_on: z.string(),
    work_hours: z.string()
});

const sync = createSync({
    description: "Sync the account's configured work schedules.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        WorkSchedule: WorkScheduleSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('WorkSchedule');

        // https://workable.readme.io/reference/work_schedules
        const response = await nango.get({
            endpoint: '/spi/v3/work_schedules',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new Error('Expected array response from /spi/v3/work_schedules');
        }

        const schedules = response.data.map((item: unknown) => {
            const parsed = WorkScheduleSchema.safeParse(item);
            if (!parsed.success) {
                throw new Error(`Failed to parse work schedule: ${parsed.error.message}`);
            }
            return parsed.data;
        });

        if (schedules.length > 0) {
            await nango.batchSave(schedules, 'WorkSchedule');
        }

        await nango.trackDeletesEnd('WorkSchedule');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
