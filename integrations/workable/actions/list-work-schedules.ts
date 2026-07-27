import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const WorkIntervalSchema = z.object({
    to_time: z.string(),
    from_time: z.string()
});

const WorkDaySchema = z.object({
    day_of_week: z.string(),
    work_hours: z.string(),
    break_duration: z.string(),
    work_intervals: z.array(WorkIntervalSchema),
    break_intervals: z.array(WorkIntervalSchema)
});

const WorkScheduleSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    work_days: z.array(WorkDaySchema),
    week_starts_on: z.string(),
    work_hours: z.string()
});

const OutputSchema = z.object({
    work_schedules: z.array(WorkScheduleSchema)
});

const action = createAction({
    description: "List the account's configured work schedules.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_account'],

    exec: async (nango, _input) => {
        const response = await nango.get({
            // https://workable.readme.io/reference/work_schedules
            endpoint: '/spi/v3/work_schedules',
            retries: 3
        });

        const parsed = z.array(WorkScheduleSchema).parse(response.data);

        return {
            work_schedules: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
