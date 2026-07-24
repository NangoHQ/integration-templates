import { z } from 'zod';
import { createAction } from 'nango';

const TimeEntryInputSchema = z.object({
    employee_id: z.string().describe('Employee ID. Example: "19ff54"'),
    clock_in_time: z.string().describe('Clock-in ISO datetime. Example: "2026-07-01T09:00:00.000Z"'),
    clock_out_time: z.string().describe('Clock-out ISO datetime. Example: "2026-07-01T17:00:00.000Z"'),
    note: z.string().optional().describe('Optional note for the time entry.'),
    override_overlapping: z.boolean().optional().describe('If true, overrides existing overlapping entries.')
});

const InputSchema = z.object({
    time_entries: z.array(TimeEntryInputSchema).max(500).describe('Array of time entries to create. Maximum 500 entries.')
});

const ProviderTimeEntrySchema = z
    .object({
        uuid: z.string(),
        employee_id: z.string(),
        clock_in_time: z.string(),
        clock_out_time: z.string(),
        note: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    time_entries: z.array(
        z
            .object({
                id: z.string(),
                employee_id: z.string(),
                clock_in_time: z.string(),
                clock_out_time: z.string(),
                note: z.string().optional().nullable()
            })
            .passthrough()
    )
});

const action = createAction({
    description: 'Create up to 500 time entries across employees in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_time_tracking'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workable.readme.io/reference/create-time-entries-bulk
            endpoint: '/spi/v3/time-tracking/time-entries',
            data: {
                time_entries: input.time_entries.map((entry) => ({
                    employee_id: entry.employee_id,
                    clock_in_time: entry.clock_in_time,
                    clock_out_time: entry.clock_out_time,
                    ...(entry.note !== undefined && { note: entry.note }),
                    ...(entry.override_overlapping !== undefined && { override_overlapping: entry.override_overlapping })
                }))
            },
            retries: 1
        });

        const providerData = z.array(z.unknown()).safeParse(response.data);

        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Workable API.'
            });
        }

        const entries = providerData.data.map((item) => {
            const parsed = ProviderTimeEntrySchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'unexpected_response',
                    message: 'Unexpected time entry shape in response.'
                });
            }
            const entry = parsed.data;
            return {
                id: entry.uuid,
                employee_id: entry.employee_id,
                clock_in_time: entry.clock_in_time,
                clock_out_time: entry.clock_out_time,
                ...(entry.note != null && { note: entry.note })
            };
        });

        return {
            time_entries: entries
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
