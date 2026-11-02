import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        officeHoursScheduleId: z.string().min(1).describe('Schedule whose date-specific overrides to list.')
    })
    .describe('Input for listing the date-specific overrides of one office hours schedule.');

const OutputIntervalSchema = z
    .object({
        endMinute: z.number().int().min(0).max(1440).describe('End offset in local calendar minutes from midnight; 1440 denotes end of day.'),
        startMinute: z.number().int().min(0).max(1440).describe('Start offset in local calendar minutes from midnight on exceptionDate.')
    })
    .describe('A single open interval in local minutes from midnight.');

const OutputExceptionSchema = z
    .object({
        id: z.string().describe('Intercom exception ID.'),
        name: z.string().nullable().optional().describe('Optional exception label; null when unnamed, omitted if not returned.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant in whole-second UTC RFC 3339.'),
        intervals: z.array(OutputIntervalSchema).nullable().optional().describe('Replacement local intervals; null for closed days, omitted if not returned.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Last modification instant in whole-second UTC RFC 3339.'),
        exceptionDate: z.iso.date().optional().describe('Local calendar date of the override, not an instant.'),
        exceptionType: z
            .enum(['closed', 'custom_hours'])
            .optional()
            .describe('closed means closed all day; custom_hours replaces regular hours with intervals.'),
        recurringAnnually: z.boolean().optional().describe('Whether this exception repeats annually on the same calendar date.'),
        officeHoursScheduleId: z.string().optional().describe('Parent schedule ID.')
    })
    .describe('A single date-specific override of an office hours schedule.');

const OutputSchema = z
    .object({
        items: z.array(OutputExceptionSchema).describe('Exceptions for the schedule in provider order; empty if none.')
    })
    .describe('Unpaginated list of date-specific overrides for one office hours schedule.');

const ProviderIntervalSchema = z.object({
    start_minute: z.number().int(),
    end_minute: z.number().int(),
    day_of_week: z.number().int().optional()
});

const ProviderExceptionSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    type: z.string().optional(),
    created_at: z.number().int().optional(),
    updated_at: z.number().int().optional(),
    exception_date: z.string().optional(),
    exception_type: z.enum(['closed', 'custom_hours']).optional(),
    time_intervals: z.array(ProviderIntervalSchema).nullable().optional(),
    recurring_annually: z.boolean().optional(),
    office_hours_schedule_id: z.string().optional()
});

const ProviderListSchema = z.object({
    type: z.string().optional(),
    data: z.array(ProviderExceptionSchema)
});

const ProxyErrorSchema = z.object({
    response: z.object({ status: z.number() }).optional()
});

function unixSecondsToRfc3339(seconds: number): string {
    return new Date(seconds * 1000).toISOString().replace('.000Z', 'Z');
}

/**
 * @tags: [read]
 * @tagReason: Performs a single GET against the provider and writes nothing.
 * @pitfalls: The provider returns exceptions ordered by date with the earliest first, which may include past dates.
 */
const tool = createTool({
    name: 'list-office-hours-exceptions',
    description: 'List all date-specific overrides for one office hours schedule.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Obtain the schedule ID from `list-office-hours-schedules`. This returns one unpaginated collection of its exceptions. Use `get-office-hours-exception` for a known exception ID and `get-office-hours-schedule` for recurring weekly hours.',
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response;
        // @allowTryCatch: the provider's 401/403/404 statuses must be mapped to the tool's public error codes.
        try {
            response = await nango.get({
                // https://raw.githubusercontent.com/intercom/Intercom-OpenAPI/main/descriptions/2.17/api.intercom.io.yaml (GET /office_hours_schedules/{office_hours_schedule_id}/office_hours_exceptions)
                endpoint: `/office_hours_schedules/${encodeURIComponent(input.officeHoursScheduleId)}/office_hours_exceptions`,
                headers: {
                    'Intercom-Version': '2.17'
                },
                retries: 3
            });
        } catch (error) {
            const parsedError = ProxyErrorSchema.safeParse(error);
            const status = parsedError.success ? parsedError.data.response?.status : undefined;
            if (status === 404) {
                throw new Error('not_found: The parent schedule is unavailable. Choose a current schedule from list-office-hours-schedules.');
            }
            if (status === 401 || status === 403) {
                throw new Error('permission_denied: The connection cannot read office-hours exceptions. Ask an administrator for office-hours access.');
            }
            throw error;
        }

        const parsed = ProviderListSchema.parse(response.data);

        const items = parsed.data.map((exception) => ({
            id: exception.id,
            ...(exception.name !== undefined && { name: exception.name }),
            ...(exception.created_at !== undefined && { createdAt: unixSecondsToRfc3339(exception.created_at) }),
            ...(exception.time_intervals !== undefined && {
                intervals:
                    exception.time_intervals === null
                        ? null
                        : exception.time_intervals.map((interval) => ({ startMinute: interval.start_minute, endMinute: interval.end_minute }))
            }),
            ...(exception.updated_at !== undefined && { updatedAt: unixSecondsToRfc3339(exception.updated_at) }),
            ...(exception.exception_date !== undefined && { exceptionDate: exception.exception_date }),
            ...(exception.exception_type !== undefined && { exceptionType: exception.exception_type }),
            ...(exception.recurring_annually !== undefined && { recurringAnnually: exception.recurring_annually }),
            ...(exception.office_hours_schedule_id !== undefined && { officeHoursScheduleId: exception.office_hours_schedule_id })
        }));

        return { items };
    }
});

export default tool;
