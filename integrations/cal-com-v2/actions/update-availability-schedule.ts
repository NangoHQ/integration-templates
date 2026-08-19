import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        scheduleId: z.number().describe('The ID of the schedule to update. Example: 254'),
        name: z.string().optional().describe('The name of the schedule. Example: "One-on-one coaching"'),
        timeZone: z.string().optional().describe('The time zone for the schedule. Example: "Europe/Rome"'),
        availability: z
            .array(
                z.object({
                    days: z
                        .array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']))
                        .describe('Array of days when this availability rule is active.'),
                    startTime: z.string().describe('Start time in HH:MM format. Example: "09:00"'),
                    endTime: z.string().describe('End time in HH:MM format. Example: "10:00"')
                })
            )
            .optional()
            .describe('Weekly availability rules for the schedule. Providing this replaces the entire existing availability array.'),
        isDefault: z.boolean().optional().describe('Whether this schedule should be the default schedule.'),
        overrides: z
            .array(
                z.object({
                    date: z.string().describe('Override date in YYYY-MM-DD format. Example: "2024-05-20"'),
                    startTime: z.string().describe('Start time in HH:MM format. Example: "12:00"'),
                    endTime: z.string().describe('End time in HH:MM format. Example: "14:00"')
                })
            )
            .optional()
            .describe('Date-specific overrides for the schedule. Providing this replaces the entire existing overrides array.')
    })
    .describe('Input for updating an availability schedule in Cal.com');

const ProviderScheduleSchema = z.object({
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
});

const OutputSchema = z
    .object({
        id: z.number().describe('The schedule ID.'),
        ownerId: z.number().describe('The ID of the user who owns the schedule.'),
        name: z.string().describe('The schedule name.'),
        timeZone: z.string().describe('The schedule time zone.'),
        availability: z
            .array(
                z.object({
                    days: z.array(z.string()).describe('Days when this rule is active, e.g. Monday, Tuesday.'),
                    startTime: z.string().describe('Start time in HH:MM format.'),
                    endTime: z.string().describe('End time in HH:MM format.')
                })
            )
            .describe('Weekly availability rules for the schedule.'),
        isDefault: z.boolean().describe('Whether this is the default schedule.'),
        overrides: z
            .array(
                z.object({
                    date: z.string().describe('Override date in YYYY-MM-DD format.'),
                    startTime: z.string().describe('Start time in HH:MM format.'),
                    endTime: z.string().describe('End time in HH:MM format.')
                })
            )
            .describe('Date-specific availability overrides.')
    })
    .describe('The updated availability schedule');

/**
 * @tags: [write]
 * @tagReason: Patches an existing availability schedule with new values through the provider API.
 * @pitfalls: Provider API examples represent availability days as numbers, yet this action requires and returns string weekday names.
 */
const action = createAction({
    description: 'Update a availability schedule in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SCHEDULE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://cal.com/docs/api-reference/v2/schedules/update-a-schedule
            endpoint: `/schedules/${encodeURIComponent(String(input.scheduleId))}`,
            headers: {
                'cal-api-version': '2024-06-11'
            },
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
                ...(input.availability !== undefined && { availability: input.availability }),
                ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
                ...(input.overrides !== undefined && { overrides: input.overrides })
            },
            retries: 10
        });

        const providerResponse = z
            .object({
                status: z.enum(['success', 'error']),
                data: ProviderScheduleSchema
            })
            .parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Schedule update returned an error status.'
            });
        }

        return {
            id: providerResponse.data.id,
            ownerId: providerResponse.data.ownerId,
            name: providerResponse.data.name,
            timeZone: providerResponse.data.timeZone,
            availability: providerResponse.data.availability,
            isDefault: providerResponse.data.isDefault,
            overrides: providerResponse.data.overrides
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
