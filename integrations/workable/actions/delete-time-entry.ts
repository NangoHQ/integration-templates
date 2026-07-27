import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().describe('Employee ID. Example: "19ff54"'),
    time_entry_id: z.string().describe('Time entry UUID. Example: "9b51c331-b1ff-405e-a42a-5678fa05bf96"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const ErrorWithResponseSchema = z.object({
    status: z.number().optional(),
    response: z
        .object({
            status: z.number(),
            data: z.unknown()
        })
        .optional()
});

const action = createAction({
    description: 'Archive/delete a time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_time_tracking'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Intercept expected Workable errors (403 Ergani, 422 archivalTooLate, 404 not found)
        // and re-throw as ActionError so callers get typed, actionable messages instead of raw proxy failures.
        try {
            // https://workable.readme.io/reference/delete-time-entry
            await nango.delete({
                endpoint: `/spi/v3/time-tracking/employees/${encodeURIComponent(input.employee_id)}/time-entries/${encodeURIComponent(input.time_entry_id)}`,
                retries: 3
            });

            return {
                success: true,
                id: input.time_entry_id
            };
        } catch (error: unknown) {
            const parsed = ErrorWithResponseSchema.safeParse(error);
            if (parsed.success) {
                const status = parsed.data.status ?? parsed.data.response?.status;

                if (status === 403) {
                    throw new nango.ActionError({
                        type: 'forbidden',
                        message: 'Unable to delete this time entry. Ergani entries or insufficient permissions.',
                        time_entry_id: input.time_entry_id
                    });
                }

                if (status === 422) {
                    throw new nango.ActionError({
                        type: 'archival_too_late',
                        message: 'Time entry is too old to archive. Only active clock-ins less than ~5.5 minutes old can be deleted.',
                        time_entry_id: input.time_entry_id
                    });
                }

                if (status === 404) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: 'Time entry or employee not found.',
                        time_entry_id: input.time_entry_id
                    });
                }
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
