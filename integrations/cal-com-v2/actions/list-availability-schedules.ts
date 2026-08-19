import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z
            .string()
            .optional()
            .describe('Pagination cursor from the previous response. For offset-based pagination, this is the next skip value. Omit for the first page.'),
        take: z.number().min(1).max(250).optional().describe('Maximum number of schedules to return. Defaults to 250.')
    })
    .describe('Input for listing availability schedules.');

const ScheduleAvailabilitySchema = z
    .object({
        days: z.array(z.string()).describe('Days when the schedule is active. Values include Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.'),
        startTime: z.string().describe('Start time in HH:MM format. Example: "08:00".'),
        endTime: z.string().describe('End time in HH:MM format. Example: "15:00".')
    })
    .describe('An availability block defining which days and hours a schedule is active.');

const ScheduleOverrideSchema = z
    .object({
        date: z.string().describe('Override date in YYYY-MM-DD format. Example: "2024-05-20".'),
        startTime: z.string().describe('Override start time in HH:MM format. Example: "12:00".'),
        endTime: z.string().describe('Override end time in HH:MM format. Example: "13:00".')
    })
    .describe('A date-specific availability override for a schedule.');

const ScheduleSchema = z
    .object({
        id: z.number().describe('Schedule ID. Example: 254.'),
        ownerId: z.number().describe('Owner (user) ID for the schedule. Example: 478.'),
        name: z.string().describe('Schedule name. Example: "Catch up hours".'),
        timeZone: z.string().describe('IANA time zone identifier. Example: "Europe/Rome".'),
        availability: z.array(ScheduleAvailabilitySchema).describe('Availability blocks for the schedule.'),
        isDefault: z.boolean().describe('Whether this schedule is the default schedule.'),
        overrides: z.array(ScheduleOverrideSchema).describe('Date-specific availability overrides.')
    })
    .describe('An availability schedule defining when the user is available for bookings.');

const OutputSchema = z
    .object({
        schedules: z.array(ScheduleSchema).describe('List of availability schedules.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page of results. Omitted when there are no more results.')
    })
    .describe('Output for listing availability schedules.');

/**
 * @tags: [read]
 * @tagReason: Reads availability schedules from the authenticated user's Cal.com account.
 */
const action = createAction({
    description: 'List availability schedules from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SCHEDULE_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        const take = input.take ?? 250;

        const response = await nango.get({
            // https://cal.com/docs/api-reference/v2/schedules/get-all-schedules
            endpoint: '/schedules',
            headers: {
                'cal-api-version': '2024-06-11'
            },
            params: {
                skip: String(skip),
                take: String(take)
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            status: z.enum(['success', 'error']),
            data: z.array(
                z.object({
                    id: z.number(),
                    ownerId: z.number(),
                    name: z.string(),
                    timeZone: z.string(),
                    availability: z.array(
                        z.object({
                            days: z.array(z.string()),
                            startTime: z.string(),
                            endTime: z.string()
                        })
                    ),
                    isDefault: z.boolean(),
                    overrides: z.array(
                        z.object({
                            date: z.string(),
                            startTime: z.string(),
                            endTime: z.string()
                        })
                    )
                })
            )
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status.'
            });
        }

        const schedules = providerResponse.data.map((schedule) => ({
            id: schedule.id,
            ownerId: schedule.ownerId,
            name: schedule.name,
            timeZone: schedule.timeZone,
            availability: schedule.availability.map((block) => ({
                days: block.days,
                startTime: block.startTime,
                endTime: block.endTime
            })),
            isDefault: schedule.isDefault,
            overrides: schedule.overrides.map((override) => ({
                date: override.date,
                startTime: override.startTime,
                endTime: override.endTime
            }))
        }));

        const nextCursor = providerResponse.data.length === take ? String(skip + take) : undefined;

        return {
            schedules,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
