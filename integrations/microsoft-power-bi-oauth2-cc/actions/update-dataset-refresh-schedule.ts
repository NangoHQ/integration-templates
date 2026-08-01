import { z } from 'zod';
import { createAction } from 'nango';

const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in 24-hour HH:mm format, e.g. "05:00"');

const InputSchema = z
    .object({
        groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
        datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"'),
        enabled: z.boolean().describe('Whether the refresh schedule is enabled.'),
        days: z.array(z.string()).optional().describe('Days of the week to refresh. Required (non-empty) when enabled is true. Example: ["Monday", "Tuesday"]'),
        times: z.array(TimeOfDaySchema).optional().describe('Times to refresh in 24-hour HH:mm format. Example: ["05:00", "17:00"]'),
        localTimeZoneId: z.string().optional().describe('Time zone ID. Example: "UTC"')
    })
    .refine((input) => !input.enabled || (input.days !== undefined && input.days.length > 0), {
        message: 'days must be a non-empty array when enabled is true.',
        path: ['days']
    });

const ProviderRefreshScheduleSchema = z.object({
    enabled: z.boolean(),
    days: z.array(z.string()).optional(),
    times: z.array(z.string()).optional(),
    localTimeZoneId: z.string().optional(),
    notifyOption: z.string().optional()
});

const OutputSchema = z.object({
    enabled: z.boolean(),
    days: z.array(z.string()).optional(),
    times: z.array(z.string()).optional(),
    localTimeZoneId: z.string().optional(),
    notifyOption: z.string().optional()
});

const action = createAction({
    description: 'Configure the automatic refresh schedule for a dataset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            value: {
                enabled: boolean;
                days?: string[];
                times?: string[];
                localTimeZoneId?: string;
            };
        } = {
            value: {
                enabled: input.enabled
            }
        };

        // Power BI requires a disable request to contain no other changes, so days/times/localTimeZoneId
        // are only ever sent when enabling the schedule.
        if (input.enabled) {
            if (input.days !== undefined) {
                body.value.days = input.days;
            }

            if (input.times !== undefined) {
                body.value.times = input.times;
            }

            if (input.localTimeZoneId !== undefined) {
                body.value.localTimeZoneId = input.localTimeZoneId;
            }
        }

        // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/update-refresh-schedule
        const response = await nango.patch({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/refreshSchedule`,
            data: body,
            retries: 3
        });

        if (response.data && typeof response.data === 'object') {
            const schedule = ProviderRefreshScheduleSchema.parse(response.data);

            return {
                enabled: schedule.enabled,
                ...(schedule.days !== undefined && { days: schedule.days }),
                ...(schedule.times !== undefined && { times: schedule.times }),
                ...(schedule.localTimeZoneId !== undefined && { localTimeZoneId: schedule.localTimeZoneId }),
                ...(schedule.notifyOption !== undefined && { notifyOption: schedule.notifyOption })
            };
        }

        return {
            enabled: body.value.enabled,
            ...(body.value.days !== undefined && { days: body.value.days }),
            ...(body.value.times !== undefined && { times: body.value.times }),
            ...(body.value.localTimeZoneId !== undefined && { localTimeZoneId: body.value.localTimeZoneId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
