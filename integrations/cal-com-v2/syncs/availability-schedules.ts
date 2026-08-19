import { createSync } from 'nango';
import { z } from 'zod';

const AvailabilityRuleSchema = z
    .object({
        days: z.array(z.string()).describe('Days of the week when this availability rule applies, e.g. Monday.'),
        startTime: z.string().describe('Start time of the availability window in HH:MM format.'),
        endTime: z.string().describe('End time of the availability window in HH:MM format.')
    })
    .describe('A weekly availability rule specifying available days and hours.');

const OverrideSchema = z
    .object({
        date: z.string().describe('Date of the override in YYYY-MM-DD format.'),
        startTime: z.string().describe('Start time of the override in HH:MM format.'),
        endTime: z.string().describe('End time of the override in HH:MM format.')
    })
    .describe('A date-specific override that temporarily changes availability.');

const ScheduleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the availability schedule.'),
        ownerId: z.number().describe('Identifier of the user who owns the schedule.'),
        name: z.string().describe('Human-readable name of the schedule.'),
        timeZone: z.string().describe('IANA timezone in which the schedule operates, e.g. America/New_York.'),
        availability: z.array(AvailabilityRuleSchema).describe('Weekly availability intervals defining when the owner is available.'),
        isDefault: z.boolean().describe('Whether this schedule is the default schedule for the owner.'),
        overrides: z.array(OverrideSchema).describe('Date-specific overrides that temporarily change availability.')
    })
    .describe('An availability schedule defining when a user can be booked.');

const ProviderAvailabilitySchema = z.object({
    days: z.array(z.string()),
    startTime: z.string(),
    endTime: z.string()
});

const ProviderOverrideSchema = z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string()
});

const ProviderScheduleSchema = z.object({
    id: z.number(),
    ownerId: z.number(),
    name: z.string(),
    timeZone: z.string(),
    availability: z.array(ProviderAvailabilitySchema),
    isDefault: z.boolean(),
    overrides: z.array(ProviderOverrideSchema)
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.array(ProviderScheduleSchema)
});

const sync = createSync({
    description: 'Sync availability schedules from Cal.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Schedule: ScheduleSchema
    },

    exec: async (nango) => {
        // GET /v2/schedules returns the authenticated user's full schedule snapshot
        // with no provider-side checkpoint boundary to advance incrementally.
        await nango.trackDeletesStart('Schedule');

        const response = await nango.get({
            // https://cal.com/docs/api-reference/v2/schedules/get-all-schedules
            endpoint: '/schedules',
            headers: {
                'cal-api-version': '2024-06-11'
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        if (parsedResponse.status !== 'success') {
            throw new Error('Cal.com API returned a non-success status for schedules.');
        }

        const schedules = parsedResponse.data.map((record) => ({
            id: String(record.id),
            ownerId: record.ownerId,
            name: record.name,
            timeZone: record.timeZone,
            availability: record.availability.map((availability) => ({
                days: availability.days,
                startTime: availability.startTime,
                endTime: availability.endTime
            })),
            isDefault: record.isDefault,
            overrides: record.overrides.map((override) => ({
                date: override.date,
                startTime: override.startTime,
                endTime: override.endTime
            }))
        }));

        if (schedules.length > 0) {
            await nango.batchSave(schedules, 'Schedule');
        }

        await nango.trackDeletesEnd('Schedule');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
