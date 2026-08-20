import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the availability schedule. Example: 254')
    })
    .describe('Input parameters for retrieving a single availability schedule');

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
    data: ProviderScheduleSchema.nullable().optional()
});

const AvailabilitySchema = z.object({
    days: z.array(z.string()).describe('Array of days when the schedule is active. Example: ["Monday", "Tuesday"]'),
    startTime: z.string().describe('Start time in HH:MM format. Example: "08:00"'),
    endTime: z.string().describe('End time in HH:MM format. Example: "15:00"')
});

const OverrideSchema = z.object({
    date: z.string().describe('Override date in YYYY-MM-DD format. Example: "2024-05-20"'),
    startTime: z.string().describe('Start time in HH:MM format. Example: "12:00"'),
    endTime: z.string().describe('End time in HH:MM format. Example: "13:00"')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the schedule. Example: 254'),
        ownerId: z.number().describe('Identifier of the user who owns the schedule. Example: 478'),
        name: z.string().describe('Name of the schedule. Example: "Catch up hours"'),
        timeZone: z.string().describe('Timezone for the schedule. Example: "Europe/Rome"'),
        availability: z.array(AvailabilitySchema).describe('Weekly availability windows for the schedule'),
        isDefault: z.boolean().describe('Whether this is the default schedule for the owner'),
        overrides: z.array(OverrideSchema).describe('Date-specific override windows for the schedule')
    })
    .describe('A single availability schedule from Cal.com');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing availability schedule from the provider without modifying it.
 * @pitfalls: OAuth access tokens must include the SCHEDULE_READ scope or the provider returns an authentication error.
 */
const action = createAction({
    description: 'Retrieve a single availability schedule from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SCHEDULE_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Cal.com returns 404
        // for a non-existent schedule, which we convert into a structured not_found error.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/schedules/get-a-schedule
                endpoint: `/schedules/${encodeURIComponent(input.id)}`,
                headers: {
                    'cal-api-version': '2024-06-11'
                },
                retries: 3
            });
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const errResponse = err.response;
                if (typeof errResponse === 'object' && errResponse !== null && 'status' in errResponse && errResponse.status === 404) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: `Schedule with id ${input.id} not found.`
                    });
                }
            }
            throw err;
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when retrieving the schedule.'
            });
        }

        if (!providerResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Schedule with id ${input.id} not found.`
            });
        }

        const schedule = providerResponse.data;

        return {
            id: schedule.id,
            ownerId: schedule.ownerId,
            name: schedule.name,
            timeZone: schedule.timeZone,
            availability: schedule.availability.map((item) => ({
                days: item.days,
                startTime: item.startTime,
                endTime: item.endTime
            })),
            isDefault: schedule.isDefault,
            overrides: schedule.overrides.map((item) => ({
                date: item.date,
                startTime: item.startTime,
                endTime: item.endTime
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
