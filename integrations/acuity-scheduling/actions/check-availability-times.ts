import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    datetime: z.string().describe('Date and time to check availability for. Must be parsable by strtotime. Example: "2026-06-25T09:00:00+0300"'),
    appointmentTypeID: z.number().describe('ID of the appointment type to check. Example: 94517100'),
    calendarID: z.number().optional().describe('ID of the calendar to check. If omitted, checks any available calendar. Example: 14209019')
});

const ProviderResponseSchema = z
    .object({
        datetime: z.string(),
        appointmentTypeID: z.number(),
        calendarID: z.number().optional(),
        valid: z.boolean(),
        error: z.string().optional(),
        message: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    datetime: z.string(),
    appointmentTypeID: z.number(),
    calendarID: z.number().optional(),
    valid: z.boolean(),
    error: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Check if a specific datetime is available for an appointment type.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/check-availability-times',
        group: 'Availability'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.acuityscheduling.com/reference/availability-check-times
            endpoint: '/availability/check-times',
            data: {
                datetime: input.datetime,
                appointmentTypeID: input.appointmentTypeID,
                ...(input.calendarID !== undefined && { calendarID: input.calendarID })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse availability check response.',
                details: parsed.error.message
            });
        }

        const providerResult = parsed.data;

        return {
            datetime: providerResult.datetime,
            appointmentTypeID: providerResult.appointmentTypeID,
            ...(providerResult.calendarID !== undefined && { calendarID: providerResult.calendarID }),
            valid: providerResult.valid,
            ...(providerResult.error !== undefined && { error: providerResult.error }),
            ...(providerResult.message !== undefined && { message: providerResult.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
