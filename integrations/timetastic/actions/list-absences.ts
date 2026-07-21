import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z.string().optional().describe('Start date in ISO 8601 format. Example: "2026-07-21"'),
    end: z.string().optional().describe('End date in ISO 8601 format. Example: "2026-07-28"'),
    absenceQueryType: z.enum(['AllEvents', 'AllAbsences', 'Bookings', 'PublicHolidays']).optional().describe('Filter for the type of absences to return.')
});

const ProviderAbsenceSchema = z.object({
    absenceType: z.enum(['Booking', 'PublicHoliday', 'NonWorkingDay', 'WorkAnniversary']),
    start: z.string(),
    end: z.string(),
    userId: z.number(),
    userName: z.string(),
    entityId: z.number()
});

const ProviderDaySchema = z.object({
    date: z.string(),
    absences: z.array(ProviderAbsenceSchema)
});

const OutputAbsenceSchema = z.object({
    absenceType: z.enum(['Booking', 'PublicHoliday', 'NonWorkingDay', 'WorkAnniversary']),
    start: z.string(),
    end: z.string(),
    userId: z.number(),
    userName: z.string(),
    entityId: z.number()
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
                absences: day.absences.map((absence) => ({
                    absenceType: absence.absenceType,
                    start: absence.start,
                    end: absence.end,
                    userId: absence.userId,
                    userName: absence.userName,
                    entityId: absence.entityId
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
