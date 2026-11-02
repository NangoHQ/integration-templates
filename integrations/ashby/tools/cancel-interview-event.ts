import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        interviewEventId: z.uuid().describe('Existing event to cancel.'),
        interviewScheduleId: z.uuid().describe('Parent schedule created by the same API key.'),
        allowFeedbackDeletion: z.boolean().optional().describe('Permit cancelling an event with submitted feedback, deleting that feedback; default false.')
    })
    .describe('Cancel one event on an Ashby interview schedule without touching the rest of the schedule.');

const OutputSchema = z
    .object({
        interviewScheduleId: z.string().describe('Affected schedule ID.'),
        status: z.string().describe('Actual resulting schedule state.'),
        interviewEventIds: z
            .array(z.string())
            .describe('Event IDs returned with the resulting schedule, without inferred deletion status for individual records.'),
        updatedAt: z.iso.datetime({ offset: true }).describe('Schedule update instant in UTC, preserving fractional precision.')
    })
    .describe('The resulting interview schedule after cancelling the selected event.');

const ProviderInterviewEventSchema = z.object({
    id: z.string()
});

const ProviderScheduleSchema = z.object({
    id: z.string(),
    status: z.string(),
    updatedAt: z.iso.datetime({ offset: true }),
    interviewEvents: z.array(ProviderInterviewEventSchema)
});

const ProviderResponseSchema = z.discriminatedUnion('success', [
    z.object({
        success: z.literal(true),
        results: ProviderScheduleSchema
    }),
    z.object({
        success: z.literal(false),
        errors: z.array(
            z.object({
                message: z.string(),
                parameter: z.string().optional()
            })
        )
    })
]);

const HttpErrorSchema = z.object({
    message: z.string().optional(),
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const ProviderErrorBodySchema = z.object({
    errors: z.array(z.object({ message: z.string() }))
});

function classifyHttpError(error: unknown): Error {
    const parsed = HttpErrorSchema.safeParse(error);
    if (!parsed.success) {
        return new Error('request_rejected: The provider request failed.');
    }
    const status = parsed.data.response?.status;
    const body = ProviderErrorBodySchema.safeParse(parsed.data.response?.data);
    const detail =
        body.success && body.data.errors.length > 0
            ? body.data.errors.map((entry) => entry.message).join('; ')
            : (parsed.data.message ?? 'The provider request failed.');
    if (status === 401 || status === 403) {
        return new Error(`permission_denied: ${detail}`);
    }
    if (status === 404) {
        return new Error(`not_found: ${detail}`);
    }
    if (status === 409) {
        return new Error(`state_conflict: ${detail}`);
    }
    return new Error(`request_rejected: ${detail}`);
}

function classifyProviderRejection(detail: string): Error {
    const text = detail.toLowerCase();
    if (text.includes('feedback')) {
        return new Error(`feedback_deletion_blocked: ${detail}`);
    }
    if (/permission|unauthorized|forbidden|not authorized|access|api key/.test(text)) {
        return new Error(`permission_denied: ${detail}`);
    }
    if (/not found|could not find|does not exist|unavailable/.test(text)) {
        return new Error(`not_found: ${detail}`);
    }
    if (/state|status|already|conflict|cannot be cancell?ed/.test(text)) {
        return new Error(`state_conflict: ${detail}`);
    }
    return new Error(`request_rejected: ${detail}`);
}

function toUtcIso(dateTime: string): string {
    // Ashby returns UTC `Z` timestamps; pass them through unchanged so fractional precision is preserved.
    return dateTime.endsWith('Z') ? dateTime : new Date(dateTime).toISOString();
}

/**
 * @tags: [write, destructive]
 * @tagReason: Cancels an interview event through Ashby's interviewSchedule.update mutation; the cancellation is difficult to reverse and permanently deletes submitted feedback when allowFeedbackDeletion is true.
 * @pitfalls: Only interview schedules created by the same API key can be updated. Cancelling an event with submitted feedback fails by default; setting allowFeedbackDeletion to true permits the cancellation but permanently deletes that feedback.
 */
const tool = createTool({
    name: 'cancel-interview-event',
    description:
        'Cancel one event on a schedule created by the same API key. Cancellation deletes associated feedback when allowFeedbackDeletion is enabled. Requires interviewsWrite permission.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Get schedule and event IDs from `list-interview-events`. This cancels only the selected event; use `cancel-interview-schedule` for the whole schedule. Feedback-bearing events are protected by default. allowFeedbackDeletion is a real provider policy that permits deleting their feedback; there is no promised undo.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const response = await nango
            .post({
                // https://developers.ashbyhq.com/reference/interviewscheduleupdate.md
                endpoint: '/interviewSchedule.update',
                data: {
                    interviewScheduleId: input.interviewScheduleId,
                    interviewEventIdToCancel: input.interviewEventId,
                    allowFeedbackDeletion: input.allowFeedbackDeletion ?? false
                },
                // Cancelling an event is not idempotent; retrying after a lost response would repeat the mutation.
                retries: 0
            })
            .catch((error: unknown) => {
                throw classifyHttpError(error);
            });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: The interviewSchedule.update response could not be mapped; inspect the schedule with `list-interview-events` before retrying.'
            );
        }

        if (!parsed.data.success) {
            const detail = parsed.data.errors.map((entry) => entry.message).join('; ');
            throw classifyProviderRejection(detail || 'Ashby rejected the cancellation request.');
        }

        const schedule = parsed.data.results;
        return {
            interviewScheduleId: schedule.id,
            status: schedule.status,
            interviewEventIds: schedule.interviewEvents.map((event) => event.id),
            updatedAt: toUtcIso(schedule.updatedAt)
        };
    }
});

export default tool;
