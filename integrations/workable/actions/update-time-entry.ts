import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().describe('Employee ID. Example: "19ff54"'),
    time_entry_id: z.string().describe('Time entry UUID. Example: "a641ffcd-f553-485b-9f99-a0847d157cb0"'),
    clock_in_time: z.string().optional().describe('New clock-in time in ISO 8601 format. Example: "2026-07-07T09:00:00.000"'),
    clock_out_time: z.string().optional().describe('New clock-out time in ISO 8601 format. Example: "2026-07-07T17:00:00.000"'),
    note: z.string().nullable().optional().describe('New note. Pass null to clear the note.'),
    override_overlapping: z.boolean().optional().describe('Set to true to override any conflicting time entries.')
});

const ProviderTimeEntrySchema = z
    .object({
        uuid: z.string(),
        employee_id: z.string().optional(),
        date: z.string().optional(),
        clock_in_time: z.string().nullable().optional(),
        clock_out_time: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        hours: z.number().nullable().optional(),
        state: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        uuid: z.string(),
        employee_id: z.string().optional(),
        date: z.string().optional(),
        clock_in_time: z.string().nullable().optional(),
        clock_out_time: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        hours: z.number().nullable().optional(),
        state: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: "Update an existing time entry's times or note.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_time_tracking'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.clock_in_time !== undefined) {
            body['clock_in_time'] = input.clock_in_time;
        }
        if (input.clock_out_time !== undefined) {
            body['clock_out_time'] = input.clock_out_time;
        }
        if (input.note !== undefined) {
            body['note'] = input.note;
        }
        if (input.override_overlapping !== undefined) {
            body['override_overlapping'] = input.override_overlapping;
        }

        if (Object.keys(body).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of clock_in_time, clock_out_time, note, or override_overlapping is required.'
            });
        }

        const response = await nango.patch({
            // https://workable.readme.io/reference/patchspi-v3time-trackingemployeesidtime-entriesuuid
            endpoint: `/spi/v3/time-tracking/employees/${encodeURIComponent(input.employee_id)}/time-entries/${encodeURIComponent(input.time_entry_id)}`,
            data: body,
            retries: 3
        });

        if (response.status === 403) {
            const errorData = z.object({ error: z.string().optional() }).safeParse(response.data);
            const errorCode = errorData.success ? errorData.data.error : undefined;
            if (errorCode === 'timeTracking.erganiRestriction') {
                throw new nango.ActionError({
                    type: 'ergani_restriction',
                    message: 'This time entry is Ergani-tracked and cannot be modified via the API.'
                });
            }
        }

        if (response.status === 409) {
            const errorData = z
                .object({
                    error: z.string().optional(),
                    conflicting_time_entries: z.array(z.unknown()).optional(),
                    conflictingEntries: z.array(z.unknown()).optional()
                })
                .safeParse(response.data);
            throw new nango.ActionError({
                type: 'overlap_conflict',
                message: 'The update conflicts with existing time entries. Use override_overlapping to force the change.',
                conflicting_entries: errorData.success ? (errorData.data.conflicting_time_entries ?? errorData.data.conflictingEntries) : undefined
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Workable API returned HTTP ${response.status}`,
                status: response.status,
                response_data: response.data
            });
        }

        const providerEntry = ProviderTimeEntrySchema.parse(response.data);

        return {
            uuid: providerEntry.uuid,
            ...(providerEntry.employee_id !== undefined && { employee_id: providerEntry.employee_id }),
            ...(providerEntry.date !== undefined && { date: providerEntry.date }),
            ...(providerEntry.clock_in_time !== undefined && { clock_in_time: providerEntry.clock_in_time }),
            ...(providerEntry.clock_out_time !== undefined && { clock_out_time: providerEntry.clock_out_time }),
            ...(providerEntry.note !== undefined && { note: providerEntry.note }),
            ...(providerEntry.hours !== undefined && { hours: providerEntry.hours }),
            ...(providerEntry.state !== undefined && { state: providerEntry.state }),
            ...(providerEntry.type !== undefined && { type: providerEntry.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
