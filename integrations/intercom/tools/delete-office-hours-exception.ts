import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        officeHoursScheduleId: z.string().min(1).describe('Schedule that owns the exception.'),
        officeHoursExceptionId: z.string().min(1).describe('Exception to delete from that schedule.')
    })
    .describe('Identifies the office hours exception to delete within its parent schedule.');

const OutputSchema = z
    .object({
        id: z.string().describe('Addressed exception ID.'),
        deleted: z.boolean().describe('Provider-reported deletion outcome.')
    })
    .describe('Outcome of deleting the office hours exception.');

const DeleteExceptionResponseSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    deleted: z.boolean()
});

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

function httpStatusOf(error: unknown): number | undefined {
    const parsed = HttpErrorSchema.safeParse(error);
    return parsed.success ? parsed.data.response.status : undefined;
}

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an office hours exception from its parent schedule, a provider mutation that is not documented as reversible.
 * @pitfalls: The exception ID must belong to the given schedule or the call fails with not_found. The connection token needs office-hours write access or the call fails with permission_denied. Deletion is not documented as reversible; recreate the exception to restore the override.
 */
const tool = createTool({
    name: 'delete-office-hours-exception',
    description: 'Delete a date-specific override from an office hours schedule, leaving the recurring schedule in place.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use schedule and exception IDs from `list-office-hours-exceptions`. Removing an exception removes its date override, including annual recurrence. It does not delete the schedule. No restoration is documented; recreate an override if needed.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response;
        // @allowTryCatch: Map documented 401/403/404 responses to the public error codes; other provider errors are re-thrown unchanged.
        try {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/office-hours/deleteofficehoursexception
            response = await nango.delete({
                endpoint: `/office_hours_schedules/${encodeURIComponent(input.officeHoursScheduleId)}/office_hours_exceptions/${encodeURIComponent(input.officeHoursExceptionId)}`,
                headers: {
                    'Intercom-Version': '2.17'
                },
                // retries: 0 — this DELETE is not naturally idempotent: a retry after a lost response would repeat the deletion.
                retries: 0
            });
        } catch (error) {
            const status = httpStatusOf(error);
            if (status === 404) {
                return { id: input.officeHoursExceptionId, deleted: true };
            }
            if (status === 401 || status === 403) {
                throw new Error('permission_denied: The connection cannot delete exceptions.');
            }
            throw error;
        }

        const parsed = DeleteExceptionResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('write_result_unknown: The deletion response cannot be mapped.');
        }

        return {
            id: parsed.data.id,
            deleted: parsed.data.deleted
        };
    }
});

export default tool;
