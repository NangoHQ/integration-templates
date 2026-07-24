import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().describe('Employee ID. Example: "19ff54"'),
    type: z.union([z.enum(['time-entry', 'clock-in', 'clock-out']), z.string().refine((val) => val.startsWith('ergani-'))]),
    clock_in_time: z.string().optional().describe('ISO 8601 datetime. Required for time-entry and clock-in.'),
    clock_out_time: z.string().optional().describe('ISO 8601 datetime. Required for time-entry and clock-out.'),
    note: z.string().optional(),
    override_overlapping: z.boolean().optional()
});

const ConflictingEntrySchema = z.object({
    uuid: z.string(),
    clock_in_time: z.string(),
    clock_out_time: z.string().optional()
});

const ProviderTimeEntrySchema = z
    .object({
        uuid: z.string(),
        type: z.string(),
        clock_in_time: z.string().optional(),
        clock_out_time: z.string().optional(),
        note: z.string().nullable().optional(),
        timezone: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    employee_id: z.string(),
    type: z.string(),
    clock_in_time: z.string().optional(),
    clock_out_time: z.string().optional(),
    note: z.string().optional(),
    timezone: z.string().optional()
});

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getHttpErrorData(err: unknown): { status: number | undefined; payload: Record<string, unknown> } | undefined {
    if (!isUnknownRecord(err)) {
        return undefined;
    }
    const status = typeof err['status'] === 'number' ? err['status'] : undefined;
    const response = isUnknownRecord(err['response']) ? err['response'] : undefined;
    const data = response && isUnknownRecord(response['data']) ? response['data'] : err;
    return { status, payload: data };
}

const action = createAction({
    description: 'Record a single clock-in/clock-out or manual time entry for an employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_time_tracking'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (['time-entry', 'clock-in'].includes(input.type) && !input.clock_in_time) {
            throw new nango.ActionError({
                type: 'missing_field',
                message: 'clock_in_time is required when type is time-entry or clock-in'
            });
        }

        if (['time-entry', 'clock-out'].includes(input.type) && !input.clock_out_time) {
            throw new nango.ActionError({
                type: 'missing_field',
                message: 'clock_out_time is required when type is time-entry or clock-out'
            });
        }

        let response;
        // @allowTryCatch We need to map provider-specific 400/409 errors to actionable ActionError payloads.
        try {
            response = await nango.post({
                // https://workable.readme.io/reference/create-time-entry
                endpoint: `/spi/v3/time-tracking/employees/${encodeURIComponent(input.employee_id)}/time-entries`,
                data: {
                    type: input.type,
                    ...(input.clock_in_time !== undefined && { clock_in_time: input.clock_in_time }),
                    ...(input.clock_out_time !== undefined && { clock_out_time: input.clock_out_time }),
                    ...(input.note !== undefined && { note: input.note }),
                    ...(input.override_overlapping !== undefined && { override_overlapping: input.override_overlapping })
                },
                retries: 10
            });
        } catch (err) {
            const errorInfo = getHttpErrorData(err);
            if (!errorInfo || errorInfo.status === undefined) {
                throw err;
            }

            if (errorInfo.status === 400) {
                const errorCode = typeof errorInfo.payload['error'] === 'string' ? errorInfo.payload['error'] : '';
                if (errorCode === 'timeEntryCreate.futureDayNotPermitted') {
                    throw new nango.ActionError({
                        type: 'future_date_not_permitted',
                        message: 'Time entry dates after today are not permitted',
                        employee_id: input.employee_id
                    });
                }
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: typeof errorInfo.payload['message'] === 'string' ? errorInfo.payload['message'] : 'Invalid request',
                    code: errorCode,
                    employee_id: input.employee_id
                });
            }

            if (errorInfo.status === 409) {
                const rawConflicts = Array.isArray(errorInfo.payload['conflicting_time_entries']) ? errorInfo.payload['conflicting_time_entries'] : [];
                const conflicts = rawConflicts
                    .map((entry: unknown) => {
                        const parsed = ConflictingEntrySchema.safeParse(entry);
                        return parsed.success ? parsed.data : null;
                    })
                    .filter((entry): entry is z.infer<typeof ConflictingEntrySchema> => entry !== null);
                throw new nango.ActionError({
                    type: 'conflicting_entries',
                    message: 'Overlapping time entries exist for this employee/day',
                    conflicting_entries: conflicts,
                    employee_id: input.employee_id
                });
            }

            throw err;
        }

        const providerEntry = ProviderTimeEntrySchema.parse(response.data);

        return {
            id: providerEntry.uuid,
            employee_id: input.employee_id,
            type: providerEntry.type,
            ...(providerEntry.clock_in_time !== undefined && { clock_in_time: providerEntry.clock_in_time }),
            ...(providerEntry.clock_out_time !== undefined && { clock_out_time: providerEntry.clock_out_time }),
            ...(providerEntry.note != null && { note: providerEntry.note }),
            ...(providerEntry.timezone !== undefined && { timezone: providerEntry.timezone })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
