import { z } from 'zod';
import { createAction } from 'nango';

const dayEnum = z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

const ScheduleAvailabilitySchema = z.object({
    days: z.array(dayEnum).describe('Days of the week when the schedule is active. Example: ["Monday", "Tuesday"]'),
    startTime: z.string().describe('Start time in 24-hour HH:MM format. Example: "09:00"'),
    endTime: z.string().describe('End time in 24-hour HH:MM format. Example: "17:00"')
});

const ScheduleOverrideSchema = z.object({
    date: z.string().describe('Date for the override in YYYY-MM-DD format. Example: "2024-05-20"'),
    startTime: z.string().describe('Override start time in 24-hour HH:MM format. Example: "18:00"'),
    endTime: z.string().describe('Override end time in 24-hour HH:MM format. Example: "21:00"')
});

const InputSchema = z
    .object({
        name: z.string().describe('Name of the availability schedule. Example: "Business Hours"'),
        timeZone: z.string().describe('IANA timezone for the schedule. Example: "America/New_York"'),
        isDefault: z.boolean().describe('Whether this is the default schedule. Each user should have exactly one default schedule.'),
        availability: z
            .array(ScheduleAvailabilitySchema)
            .optional()
            .describe('Availability rules defining when the user is available. Defaults to Monday-Friday 09:00-17:00 if omitted.'),
        overrides: z.array(ScheduleOverrideSchema).optional().describe('Date-specific availability overrides.')
    })
    .describe('Input for creating an availability schedule.');

const ProviderResponseSchema = z.object({
    status: z.string(),
    data: z.object({
        id: z.number(),
        ownerId: z.number(),
        name: z.string(),
        timeZone: z.string(),
        isDefault: z.boolean(),
        availability: z.array(
            z.object({
                days: z.array(dayEnum),
                startTime: z.string(),
                endTime: z.string()
            })
        ),
        overrides: z.array(
            z.object({
                date: z.string(),
                startTime: z.string(),
                endTime: z.string()
            })
        )
    })
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created schedule.'),
        ownerId: z.number().describe('ID of the user who owns the schedule.'),
        name: z.string().describe('Name of the schedule.'),
        timeZone: z.string().describe('IANA timezone of the schedule.'),
        isDefault: z.boolean().describe('Whether this schedule is the default for the user.'),
        availability: z
            .array(
                z.object({
                    days: z.array(dayEnum).describe('Days of the week when the schedule is active.'),
                    startTime: z.string().describe('Start time in 24-hour HH:MM format.'),
                    endTime: z.string().describe('End time in 24-hour HH:MM format.')
                })
            )
            .describe('Availability rules for the schedule.'),
        overrides: z
            .array(
                z.object({
                    date: z.string().describe('Date of the override in YYYY-MM-DD format.'),
                    startTime: z.string().describe('Override start time in 24-hour HH:MM format.'),
                    endTime: z.string().describe('Override end time in 24-hour HH:MM format.')
                })
            )
            .describe('Date-specific availability overrides.')
    })
    .describe('Output of the created availability schedule.');

/**
 * @tags: [write]
 * @tagReason: Creates a new availability schedule on the provider.
 * @pitfalls: The live API requires full weekday strings like "Monday" in availability.days despite some provider docs showing numeric indices. Omitting availability silently defaults to Monday–Friday 09:00–17:00 instead of no availability, and each user can have only one default schedule.
 */
const action = createAction({
    description: 'Create an availability schedule in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SCHEDULE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.post({
                // https://cal.com/docs/api-reference/v2/schedules/create-a-schedule
                endpoint: '/schedules',
                headers: {
                    'cal-api-version': '2024-06-11'
                },
                data: {
                    name: input.name,
                    timeZone: input.timeZone,
                    isDefault: input.isDefault,
                    ...(input.availability !== undefined && { availability: input.availability }),
                    ...(input.overrides !== undefined && { overrides: input.overrides })
                },
                retries: 3
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when creating the availability schedule.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.data.id,
            ownerId: providerResponse.data.ownerId,
            name: providerResponse.data.name,
            timeZone: providerResponse.data.timeZone,
            isDefault: providerResponse.data.isDefault,
            availability: providerResponse.data.availability,
            overrides: providerResponse.data.overrides
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
