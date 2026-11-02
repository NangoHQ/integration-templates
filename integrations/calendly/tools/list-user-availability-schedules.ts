import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        userId: z.string().min(1).describe('Canonical user API URI or opaque user UUID whose configured schedules are requested.')
    })
    .describe('Identifies the user whose availability schedules are listed.');

const ScheduleIntervalSchema = z
    .object({
        from: z.string().optional().describe('Local interval start in 24-hour HH:mm notation, if supplied.'),
        to: z.string().optional().describe('Local interval end in 24-hour HH:mm notation, if supplied.')
    })
    .describe('One allowed local-time booking interval.');

const ScheduleRuleSchema = z
    .object({
        type: z.enum(['wday', 'date']).describe('Whether the rule applies to a weekday or specific date.'),
        intervals: z.array(ScheduleIntervalSchema).describe('Allowed local-time intervals; [] means no booking availability for this rule.'),
        weekday: z
            .enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
            .optional()
            .describe('Selected weekday when supplied; retain even if date is also present.'),
        date: z.iso.date().optional().describe('Selected calendar date when supplied; never converted to an instant.')
    })
    .describe('One availability rule, selected by weekday or by calendar date.');

const ScheduleSchema = z
    .object({
        id: z.string().describe('Canonical availability-schedule URI exactly as returned, including any singular resource spelling.'),
        isDefault: z.boolean().describe("Whether this is the user's default schedule."),
        name: z.string().describe('Human-readable schedule name.'),
        userId: z.string().describe('Canonical user API URI owning the schedule.'),
        timezone: z.string().describe("Named timezone governing the schedule's local times."),
        rules: z.array(ScheduleRuleSchema).describe('Availability rules in source order.')
    })
    .describe('One availability schedule configured by the user.');

const OutputSchema = z
    .object({
        items: z.array(ScheduleSchema).describe('Availability schedules returned for the user in one unpaginated collection.')
    })
    .describe("The user's availability schedules as one unpaginated collection.");

const ProviderIntervalSchema = z.object({
    from: z.string().optional().nullable(),
    to: z.string().optional().nullable()
});

const ProviderRuleSchema = z.object({
    type: z.enum(['wday', 'date']),
    wday: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).optional().nullable(),
    date: z.string().optional().nullable(),
    intervals: z.array(ProviderIntervalSchema)
});

const ProviderScheduleSchema = z.object({
    uri: z.string(),
    default: z.boolean(),
    name: z.string(),
    user: z.string(),
    timezone: z.string(),
    rules: z.array(ProviderRuleSchema)
});

const ProviderResponseSchema = z.object({
    collection: z.array(ProviderScheduleSchema)
});

const HttpErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            headers: z.record(z.string(), z.unknown()).optional()
        })
        .optional()
});

function toPublicError(error: unknown): Error {
    const parsed = HttpErrorSchema.safeParse(error);
    const response = parsed.success ? parsed.data.response : undefined;
    const status = response?.status;

    if (status === 400) {
        return new Error('invalid_request: Calendly rejected the user reference. Use the userId returned by `get-user`.');
    }
    if (status === 403) {
        return new Error(
            "permission_denied: The user is outside the caller's organization or the caller lacks the availability:read scope. Choose an accessible organization member and ask for the required scope."
        );
    }
    if (status === 404) {
        return new Error('not_found: The requested user is unavailable. Check the user with `get-user`.');
    }
    if (status === 429) {
        const reset = response?.headers?.['x-ratelimit-reset'];
        const detail =
            typeof reset === 'string' ? ` Retry after ${reset} seconds (X-RateLimit-Reset).` : ' Wait for the indicated rate-limit reset before retrying.';
        return new Error(`rate_limited: Calendly's user-based request limit was exceeded.${detail}`);
    }
    if (typeof status === 'number' && status >= 500) {
        return new Error('provider_error: Calendly reported a server error. Retry later.');
    }
    if (error instanceof Error) {
        return error;
    }
    return new Error('provider_error: The Calendly request failed with an unexpected error.');
}

/**
 * @tags: [read]
 * @tagReason: Only reads the user's availability schedules from Calendly; nothing is created, updated, or deleted.
 * @pitfalls: A rule can return both weekday and date together even though the provider documents them as mutually exclusive per type, so branch on which selectors are present rather than on type alone. Interval times and date selectors are local wall-clock values that are only meaningful with the schedule's named timezone, and an empty intervals array means that rule is closed to booking rather than missing data.
 */
const tool = createTool({
    name: 'list-user-availability-schedules',
    description: "List a user's availability schedules, preserving local wall-clock rules and their named timezone.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Obtain userId from `get-user`. Use `get-user-availability-schedule` for a known schedule. This lists configured recurring/date availability, not actual free time; use `list-user-busy-times` to inspect conflicts. The provider returns this collection without pagination.',
        requiredScopes: ['availability:read'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const userUri = input.userId.includes('://') ? input.userId : `https://api.calendly.com/users/${encodeURIComponent(input.userId)}`;

        let data: unknown;
        // @allowTryCatch: map Calendly HTTP error statuses to the tool's public error codes.
        try {
            // https://developer.calendly.com/api-docs/calendly-api/availability/list-user-availability-schedules
            const response = await nango.get({
                endpoint: '/user_availability_schedules',
                params: {
                    user: userUri
                },
                retries: 3
            });
            data = response.data;
        } catch (error) {
            const publicError = toPublicError(error);
            if (publicError.message.startsWith('not_found')) {
                return { items: [] };
            }
            throw publicError;
        }

        const parsed = ProviderResponseSchema.safeParse(data);
        if (!parsed.success) {
            throw new Error('provider_error: Calendly returned an unexpected availability-schedule payload.');
        }

        return {
            items: parsed.data.collection.map((schedule) => ({
                id: schedule.uri,
                isDefault: schedule.default,
                name: schedule.name,
                userId: schedule.user,
                timezone: schedule.timezone,
                rules: schedule.rules.map((rule) => ({
                    type: rule.type,
                    intervals: rule.intervals.map((interval) => ({
                        ...(interval.from != null && { from: interval.from }),
                        ...(interval.to != null && { to: interval.to })
                    })),
                    ...(rule.wday != null && { weekday: rule.wday }),
                    ...(rule.date != null && { date: rule.date })
                }))
            }))
        };
    }
});

export default tool;
