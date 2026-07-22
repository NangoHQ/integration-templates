import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z.string().optional().describe('Start date in ISO 8601 format. Example: "2026-07-21"'),
    end: z.string().optional().describe('End date in ISO 8601 format. Example: "2026-07-28"'),
    absenceQueryType: z.enum(['AllEvents', 'AllAbsences', 'Bookings', 'PublicHolidays']).optional().describe('Filter for the type of absences to return.')
});

const ABSENCE_TYPES: readonly ['Booking', 'PublicHoliday', 'NonWorkingDay', 'LockedDate', 'Birthday', 'WorkAnniversary'] = [
    'Booking',
    'PublicHoliday',
    'NonWorkingDay',
    'LockedDate',
    'Birthday',
    'WorkAnniversary'
];

const ProviderAbsenceSchema = z.object({
    absenceType: z.enum(ABSENCE_TYPES),
    start: z.string(),
    end: z.string(),
    detail: z.string().nullable().optional(),
    entityId: z.number().nullable().optional(),
    userId: z.number().nullable().optional(),
    userName: z.string().nullable().optional(),
    startUtc: z.string().nullable().optional(),
    endUtc: z.string().nullable().optional()
});

const ProviderDaySchema = z.object({
    date: z.string(),
    absences: z.array(ProviderAbsenceSchema).nullable().optional()
});

const OutputAbsenceSchema = z.object({
    absenceType: z.enum(ABSENCE_TYPES),
    start: z.string(),
    end: z.string(),
    detail: z.string().optional(),
    entityId: z.number().optional(),
    userId: z.number().optional(),
    userName: z.string().optional(),
    startUtc: z.string().optional(),
    endUtc: z.string().optional()
});

const OutputDaySchema = z.object({
    date: z.string(),
    absences: z.array(OutputAbsenceSchema)
});

const OutputSchema = z.object({
    days: z.array(OutputDaySchema)
});

const action = createAction({
    description: 'Get a chronological, day-by-day list of who is off within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: '/absences',
            params: {
                ...(input.start !== undefined && { Start: input.start }),
                ...(input.end !== undefined && { End: input.end }),
                ...(input.absenceQueryType !== undefined && { AbsenceQueryType: input.absenceQueryType })
            },
            retries: 3
        });

        const providerDays = z.array(ProviderDaySchema).parse(response.data);

        return {
            days: providerDays.map((day) => ({
                date: day.date,
                absences: (day.absences ?? []).map((absence) => ({
                    absenceType: absence.absenceType,
                    start: absence.start,
                    end: absence.end,
                    ...(absence.detail != null && { detail: absence.detail }),
                    ...(absence.entityId != null && { entityId: absence.entityId }),
                    ...(absence.userId != null && { userId: absence.userId }),
                    ...(absence.userName != null && { userName: absence.userName }),
                    ...(absence.startUtc != null && { startUtc: absence.startUtc }),
                    ...(absence.endUtc != null && { endUtc: absence.endUtc })
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
